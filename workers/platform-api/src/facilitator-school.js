// Link an existing authenticated account; never create a second user record.
export async function linkFacilitatorSchool(env, actor, data, {runTransaction, safeId}) {
  const fail = (message, status = 409) => { throw Object.assign(new Error(message), {status}); };
  if (!['admin', 'super_admin'].includes(actor.profile.role) || actor.supportMode || actor.profile.supportMode) {
    fail('Organisation administrator access required. Exit school support mode first.', 403);
  }
  const userId = safeId(data.userId, 'user identifier');
  const schoolId = safeId(data.schoolId, 'school identifier');
  const programmeId = data.programmeId ? safeId(data.programmeId, 'programme identifier') : '';
  return runTransaction(env, async tx => {
    const target = await tx.get('users/' + userId);
    const school = await tx.get('schools/' + schoolId);
    const programme = programmeId ? await tx.get('programmes/' + programmeId) : null;
    if (!target || !school || (programmeId && !programme)) fail('Account, school or programme not found.', 404);
    if (target.role !== 'teacher') fail('Select an existing teacher / facilitator account.', 400);
    if (!['approved', 'active'].includes(target.status)) fail('Approve the facilitator account before linking it.');
    if (!['approved', 'active'].includes(school.status)) fail('The school must be approved or active.');
    if ((target.schoolId && target.schoolId !== schoolId) ||
        (target.schoolCode && target.schoolCode !== school.schoolCode)) {
      fail('This facilitator is already linked to another school. A school transfer requires separate review.');
    }
    if (programme && (programme.schoolId !== schoolId || programme.status !== 'active')) {
      fail('Choose an active programme belonging to the selected school.');
    }
    const now = new Date().toISOString();
    tx.patch('users/' + userId, {
      schoolId, schoolCode: school.schoolCode || '', schoolName: school.schoolName || school.name || '',
      schoolVerificationStatus: 'verified', schoolLinkedAt: now, schoolLinkedBy: actor.uid, updatedAt: now
    });
    if (programme) tx.patch('programmes/' + programmeId, {
      facilitatorIds: [...new Set([...(Array.isArray(programme.facilitatorIds) ? programme.facilitatorIds : []), userId])],
      updatedAt: now
    });
    tx.set('adminAuditLogs/facilitator_' + crypto.randomUUID(), {
      action: 'facilitator_school_linked', actorUid: actor.uid, userId, schoolId, programmeId,
      previousSchoolId: target.schoolId || '', previousSchoolCode: target.schoolCode || '', createdAt: now
    });
    return {ok: true, userId, schoolId, programmeId};
  });
}

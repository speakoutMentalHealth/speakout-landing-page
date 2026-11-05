// Display safe, actionable responses to temporary backend failures.
export function isQuotaError(error) {
  const status = Number(error?.status);
  const code = String(error?.code || error?.firestoreStatus || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return status === 429 || code.includes('resource-exhausted') ||
    code.includes('resource_exhausted') ||
    /(?:quota exceeded|quota has been exceeded|resource.exhausted|daily quota|too many requests)/.test(message);
}

export function cmsErrorMessage(error, action = 'load') {
  if (isQuotaError(error)) {
    return action === 'save'
      ? 'Publishing is temporarily limited by the database quota. Your text is still in the editor; this change has NOT been confirmed. Check Firestore Usage and try later—avoid repeated Save taps.'
      : 'News records are temporarily unavailable because the database reported a quota limit. Avoid repeated refreshes. Check Firestore Usage and try again when capacity returns.';
  }
  if (error?.code === 'permission-denied' || Number(error?.status) === 403) {
    return 'You do not have permission for this operation. Sign in with an approved SpeakOut administrator account.';
  }
  if (Number(error?.status) === 409) {
    return 'This item is not ready to publish. Check its headline, summary (40+ characters), category and date.';
  }
  return action === 'save'
    ? 'The change could not be confirmed. Your text remains in the editor; check your connection and try again.'
    : 'Could not load the records. Check your connection and try again.';
}

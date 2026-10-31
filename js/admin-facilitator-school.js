export function setupFacilitatorSchoolLink({db, collection, getDocs, adminApi}) {
  const el = id => document.getElementById(id);
  const form = el('schoolLinkForm'), schoolSelect = el('linkSchool'), programmeSelect = el('linkProgramme');
  const status = el('schoolLinkStatus'), button = el('schoolLinkButton');
  let current = null, programmes = [], generation = 0;
  const option = (label, value) => new Option(label, value);
  function renderProgrammes() {
    programmeSelect.replaceChildren(option('School link only', ''));
    for (const p of programmes.filter(p => p.schoolId === schoolSelect.value && p.status === 'active')) {
      programmeSelect.add(option(p.name || 'Programme', p.id));
    }
  }
  schoolSelect.addEventListener('change', renderProgrammes);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!current || !schoolSelect.value || button.disabled) return;
    const userId = current.id, selectedSchool = schoolSelect.selectedOptions[0].textContent;
    const selectedProgramme = programmeSelect.value ? programmeSelect.selectedOptions[0].textContent : '';
    if (!window.confirm(`Link ${current.fullName || current.email} (${current.email}) to ${selectedSchool}${selectedProgramme ? ' and assign ' + selectedProgramme : ''}?`)) return;
    const version = generation;
    button.disabled = true;
    try {
      await adminApi.linkFacilitatorSchool({userId, schoolId: schoolSelect.value, programmeId: programmeSelect.value});
      if (version === generation) status.textContent = 'Facilitator linked successfully. Ask her to sign out and sign in again.';
    } catch (error) {
      if (version === generation) status.textContent = error.message || 'Could not link facilitator.';
    } finally { if (version === generation) button.disabled = false; }
  });
  return {
    close() { generation++; current = null; form.hidden = true; },
    async open(user) {
      const version = ++generation;
      current = user;
      form.hidden = user.role !== 'teacher';
      if (form.hidden) return;
      button.disabled = true;
      schoolSelect.replaceChildren(option('Select school', ''));
      programmeSelect.replaceChildren(option('School link only', ''));
      status.textContent = 'Loading schools and active programmes…';
      try {
        const [schools, entries] = await Promise.all([getDocs(collection(db, 'schools')), getDocs(collection(db, 'programmes'))]);
        if (version !== generation) return;
        programmes = entries.docs.map(d => ({...d.data(), id: d.id}));
        for (const d of schools.docs) {
          const s = d.data();
          if (['approved', 'active'].includes(s.status)) schoolSelect.add(option(`${s.schoolName || s.name || d.id} (${s.schoolCode || d.id})`, d.id));
        }
        schoolSelect.value = user.schoolId || '';
        renderProgrammes();
        status.textContent = 'Select the school and, if ready, its active club. Review the confirmation before saving.';
        button.disabled = false;
      } catch (error) { if (version === generation) status.textContent = error.message || 'Could not load schools.'; }
    }
  };
}

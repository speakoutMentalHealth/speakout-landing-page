// Track selection organises content; it grants no access or accreditation.
export const CONTENT_TRACKS = Object.freeze({
 'school-curriculum':'School-curriculum material',
 supplementary:'Supplementary / enrichment',
 unclassified:'Content type not yet classified'
});
export function contentTrack(item = {}) {
 const raw=item.contentTrack !== undefined ? item.contentTrack : item.curriculum?.track;
 return ['school-curriculum','supplementary'].includes(raw)?raw:'unclassified';
}
export function parseContentTrack(value) {
 if(!['','school-curriculum','supplementary'].includes(value))throw Error('Choose a supported content type.');
 return {contentTrack:value};
}
export function contentTrackLabel(item) {
 const track=contentTrack(item);
 // An admin string or class label is not evidence of human outcome verification.
 return track==='school-curriculum'?'School-curriculum material · alignment not established':CONTENT_TRACKS[track];
}

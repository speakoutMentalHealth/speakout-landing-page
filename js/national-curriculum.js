// National subject framework; not lesson coverage, accreditation or eligibility.
export const NATIONAL_CURRICULUM = Object.freeze({
 version:1,checkedOn:'2026-10-10',framework:'Revised national school curriculum',
 sources:[
  {title:'NERDC subject offerings',url:'https://nerdc.gov.ng/content_manager/pdf_files/Basic%20and%20Senior%20Secondary%20Education%20Curriculum%20Offerings.pdf',scope:'Subject structure inspected; publication date not printed'},
  {title:'FME reform announcement',url:'https://education.gov.ng/wp-content/uploads/2025/09/FG-OVERHAULS-CURRICULUM.pdf',scope:'3 September 2025; implementation announced for 2025/26'}
 ],
 sharedBasicSubjects:['English Studies','Mathematics','One Nigerian language','Physical & Health Education','Nigerian History','Social and Citizenship Studies','Cultural & Creative Arts','Christian Religious Studies or Islamic Studies, as applicable'],
 groups:[
  {id:'lower-primary',stage:'primary',classes:['Primary 1','Primary 2','Primary 3'],label:'Primary 1–3',additional:['Basic Science'],optional:['Arabic Language']},
  {id:'upper-primary',stage:'primary',classes:['Primary 4','Primary 5','Primary 6'],label:'Primary 4–6',additional:['Basic Science and Technology','Basic Digital Literacy','Pre-vocational Studies'],optional:['French','Arabic Language']},
  {id:'junior-secondary',stage:'secondary',classes:['JSS 1','JSS 2','JSS 3'],label:'JSS 1–3',additional:['Intermediate Science','Digital Technologies','Business Studies','One trade subject'],optional:['French','Arabic Language']},
  {id:'senior-secondary',stage:'secondary',classes:['SS 1','SS 2','SS 3'],label:'SS 1–3',core:['English Language','General Mathematics','One trade subject','Citizenship and Heritage Studies','Digital Technologies'],pathways:['Science','Humanities','Business']}
 ]
});
export function nationalGroupForClass(classLevel){return NATIONAL_CURRICULUM.groups.find(group=>group.classes.includes(classLevel))||null;}

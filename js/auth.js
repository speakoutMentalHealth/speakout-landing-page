import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { onboardingApi } from "./platform-api.js";

function projectUrl(path){
  return new URL(`../${String(path||"").replace(/^\/+/, "")}`, import.meta.url).href;
}

const ROLE_DASHBOARDS={
  student:"student-dashboard.html",
  parent:"parent-dashboard.html",
  teacher:"teacher-dashboard.html",
  school:"school-dashboard.html",
  school_admin:"school-dashboard.html",
  admin:"admin-dashboard.html",
  super_admin:"admin-dashboard.html",
  ambassador:"ambassador-dashboard.html",
  contributor:"contributor.html",
  volunteer:"student-dashboard.html"
};

const clean=value=>String(value||"").trim();
const normalize=value=>clean(value).toLowerCase().replace(/\s+/g,"_");
const byId=id=>document.getElementById(id);
const value=id=>clean(byId(id)?.value);

function dashboardForRole(role){
  const route=ROLE_DASHBOARDS[normalize(role)];
  return projectUrl(route||"auth.html");
}

function setMessage(target,message,type="info"){
  if(!target) return;
  target.textContent=message;
  target.className=`message ${type==="success"?"ok":type==="warning"?"warn":type==="error"?"bad":""}`;
  target.style.display="block";
}
const showLogin=(m,t="info")=>setMessage(byId("loginMsg"),m,t);
const showRegister=(m,t="info")=>setMessage(byId("regMsg"),m,t);
const showSchool=(m,t="info")=>setMessage(byId("schoolRegMsg"),m,t);
const showSchoolAdmin=(m,t="info")=>setMessage(byId("schoolAdminMsg"),m,t);

function selectPanel(panelId){
  document.querySelectorAll(".access-panel").forEach(panel=>panel.classList.toggle("active",panel.id===panelId));
  document.querySelectorAll("[data-tab-target]").forEach(button=>button.classList.toggle("active",button.dataset.tabTarget===panelId));
}

document.querySelectorAll("[data-tab-target]").forEach(button=>{
  button.addEventListener("click",()=>{
    selectPanel(button.dataset.tabTarget);
    const hash=button.dataset.tabTarget==="loginPanel"?"login":button.dataset.tabTarget==="joinPanel"?"join":"school";
    history.replaceState(null,"",`${location.pathname}${location.search}#${hash}`);
  });
});

async function getUserProfile(uid){
  const snap=await getDoc(doc(db,"users",uid));
  return snap.exists()?{uid,...snap.data()}:null;
}

async function redirectByUserRole(user){
  const profile=await getUserProfile(user.uid);
  if(!profile){
    showLogin("Your account exists, but your SpeakOut profile was not found. Please contact SpeakOut admin.","error");
    await signOut(auth);
    return;
  }
  const approved=profile.approved===true||normalize(profile.status)==="approved";
  if(!approved){
    showLogin(
      normalize(profile.schoolVerificationStatus)==="pending"
        ?"Your account is waiting for verification by your school administrator."
        :"Your account is pending approval.",
      "warning"
    );
    sessionStorage.setItem("speakoutManualLogout","true");
    await signOut(auth);
    return;
  }
  window.location.replace(dashboardForRole(profile.role));
}

async function handleLogin(event){
  event.preventDefault();
  const email=value("loginEmail"), password=value("loginPassword");
  if(!email||!password){showLogin("Enter your email and password.","error");return;}
  try{
    sessionStorage.removeItem("speakoutManualLogout");
    showLogin("Signing you in...");
    const credential=await signInWithEmailAndPassword(auth,email,password);
    await redirectByUserRole(credential.user);
  }catch(error){
    console.error("Login error:",error);
    showLogin(error?.code==="auth/invalid-credential"?"Incorrect email or password.":"Login failed. Please check your details and try again.","error");
  }
}

let resolvedSchool=null;
let resolvedCode="";

function clearResolvedSchool(){
  resolvedSchool=null;
  resolvedCode="";
  const box=byId("schoolResolvedBox");
  box?.classList.remove("show","verify-ok");
  if(byId("schoolResolvedName")) byId("schoolResolvedName").textContent="";
  if(byId("schoolResolvedMeta")) byId("schoolResolvedMeta").textContent="";
  if(byId("schoolName")) byId("schoolName").value="";
  syncStudentFields();
}

function syncStudentFields(){
  const role=normalize(value("role"));
  const show=role==="student"&&Boolean(resolvedSchool);
  const wrap=byId("studentVerificationFields");
  if(wrap) wrap.style.display=show?"block":"none";
  const reg=byId("registrationNumber");
  if(reg) reg.required=show;
}

async function resolveSchoolCode(){
  const code=value("schoolCode").toUpperCase();
  if(!code){clearResolvedSchool();return null;}
  try{
    const result=await onboardingApi.resolveSchool(code);
    resolvedSchool=result.school;
    resolvedCode=code;
    byId("schoolCode").value=result.school.schoolCode||code;
    byId("schoolName").value=result.school.schoolName||"";
    byId("schoolResolvedName").textContent=`✓ ${result.school.schoolName}`;
    byId("schoolResolvedMeta").textContent=[result.school.schoolType,result.school.city,result.school.state].filter(Boolean).join(" • ");
    byId("schoolResolvedBox").classList.add("show","verify-ok");
    syncStudentFields();
    return resolvedSchool;
  }catch(error){
    clearResolvedSchool();
    byId("schoolResolvedBox")?.classList.add("show");
    if(byId("schoolResolvedName")) byId("schoolResolvedName").textContent="School code not verified";
    if(byId("schoolResolvedMeta")) byId("schoolResolvedMeta").textContent=error.message||"Check the code and try again.";
    throw error;
  }
}

byId("verifySchoolBtn")?.addEventListener("click",async()=>{
  try{await resolveSchoolCode();}catch{}
});
byId("schoolCode")?.addEventListener("input",()=>{
  if(clean(byId("schoolCode").value).toUpperCase()!==resolvedCode) clearResolvedSchool();
});
byId("role")?.addEventListener("change",syncStudentFields);

async function createIndividualProfile(credential,data){
  await setDoc(doc(db,"users",credential.user.uid),{
    uid:credential.user.uid,
    ...data,
    status:"pending",
    approved:false,
    profileCompleted:false,
    createdAt:serverTimestamp(),
    updatedAt:serverTimestamp()
  },{merge:true});
}

async function handleRegister(event){
  event.preventDefault();
  const firstName=value("firstName"), lastName=value("lastName"), fullName=`${firstName} ${lastName}`.trim();
  const email=value("email"), phone=value("phone"), password=value("password"), confirmPassword=value("confirmPassword");
  const role=normalize(value("role")||"student"), schoolCode=value("schoolCode").toUpperCase();
  const locationValue=value("location"), reason=value("reason"), contentType=value("contentType");
  if(!firstName||!lastName||!email||!password){showRegister("Enter your first name, last name, email and password.","error");return;}
  if(password.length<6){showRegister("Your password must contain at least 6 characters.","error");return;}
  if(password!==confirmPassword){showRegister("Your passwords do not match.","error");return;}
  if(!byId("terms")?.checked){showRegister("Please confirm the terms before submitting.","error");return;}
  if(schoolCode&&(!resolvedSchool||resolvedCode!==schoolCode)){
    try{await resolveSchoolCode();}catch{showRegister("Verify your school code before creating the account.","error");return;}
  }
  const schoolLinked=Boolean(resolvedSchool);
  const registrationNumber=value("registrationNumber");
  if(schoolLinked&&role==="student"&&!registrationNumber){
    showRegister("Enter your student registration or matric number so your school can verify you.","error");return;
  }

  let credential=null;
  let profileCreated=false;
  sessionStorage.setItem("speakoutOnboarding","true");
  try{
    showRegister(schoolLinked?"Creating your account and linking your school...":"Creating your account...");
    credential=await createUserWithEmailAndPassword(auth,email,password);
    if(schoolLinked){
      await onboardingApi.joinSchool({
        firstName,lastName,fullName,phone,role,schoolCode,
        registrationNumber,
        department:value("department"),
        level:value("level"),
        location:locationValue,
        reason,
        contentType
      });
      profileCreated=true;
    }else{
      await createIndividualProfile(credential,{
        firstName,lastName,fullName,email,phone,role,
        schoolCode:"",schoolName:"",schoolId:"",
        location:locationValue,reason,...(contentType?{contentType}:{})
      });
      profileCreated=true;
    }
    sessionStorage.setItem("speakoutManualLogout","true");
    await signOut(auth);
    showRegister(
      schoolLinked
        ?"Account created. Your school must verify your details before institutional access is approved."
        :"Account created successfully. Your application is now pending approval.",
      "success"
    );
    byId("registerForm")?.reset();
    clearResolvedSchool();
  }catch(error){
    console.error("Registration error:",error);
    if(credential?.user&&!profileCreated){
      try{await deleteUser(credential.user);}catch{}
    }
    const message=error?.code==="auth/email-already-in-use"
      ?"An account already exists with this email address."
      :error?.message||"Registration failed.";
    showRegister(message,"error");
  }finally{
    sessionStorage.removeItem("speakoutOnboarding");
  }
}

async function handleSchoolRegistration(event){
  event.preventDefault();
  const submit=event.submitter;
  if(submit) submit.disabled=true;
  try{
    showSchool("Submitting your institution for review...");
    const result=await onboardingApi.registerSchool({
      schoolName:value("regSchoolName"),
      schoolType:value("regSchoolType"),
      address:value("regSchoolAddress"),
      city:value("regSchoolCity"),
      state:value("regSchoolState"),
      country:value("regSchoolCountry"),
      estimatedStudents:value("regSchoolStudents"),
      schoolWebsite:value("regSchoolWebsite"),
      adminName:value("regAdminName"),
      adminPosition:value("regAdminPosition"),
      adminEmail:value("regAdminEmail"),
      adminPhone:value("regAdminPhone"),
      interestArea:value("regInterestArea"),
      needs:value("regSchoolNeeds"),
      website:value("schoolWebsiteTrap")
    });
    showSchool(`Registration received. Reference: ${result.applicationId}. SpeakOut will review the institution before a school code and administrator access are issued.`,"success");
    byId("schoolRegisterForm")?.reset();
    if(byId("regSchoolCountry")) byId("regSchoolCountry").value="Nigeria";
  }catch(error){
    console.error("School registration error:",error);
    showSchool(error.message||"School registration could not be submitted.","error");
  }finally{if(submit) submit.disabled=false;}
}

async function handleSchoolAdminActivation(event){
  event.preventDefault();
  const params=new URLSearchParams(location.search);
  const inviteToken=clean(params.get("schoolInvite"));
  if(!inviteToken){showSchoolAdmin("This activation link is incomplete.","error");return;}
  const fullName=value("schoolAdminName"), position=value("schoolAdminPosition"), email=value("schoolAdminEmail"), phone=value("schoolAdminPhone");
  const password=value("schoolAdminPassword"), confirm=value("schoolAdminConfirmPassword");
  if(!fullName||!position||!email||!password){showSchoolAdmin("Complete the administrator details.","error");return;}
  if(password.length<6){showSchoolAdmin("Password must contain at least 6 characters.","error");return;}
  if(password!==confirm){showSchoolAdmin("Your passwords do not match.","error");return;}
  let credential=null;
  sessionStorage.setItem("speakoutOnboarding","true");
  try{
    showSchoolAdmin("Activating your school administrator account...");
    credential=await createUserWithEmailAndPassword(auth,email,password);
    const result=await onboardingApi.activateSchoolAdmin({inviteToken,fullName,position,phone});
    sessionStorage.removeItem("speakoutOnboarding");
    showSchoolAdmin(`School access activated for ${result.schoolName}. Redirecting...`,"success");
    window.location.replace(projectUrl("school-dashboard.html"));
  }catch(error){
    console.error("School admin activation error:",error);
    if(credential?.user){try{await deleteUser(credential.user);}catch{}}
    showSchoolAdmin(error?.code==="auth/email-already-in-use"?"An account already exists with this email address.":error.message||"Activation failed.","error");
  }finally{sessionStorage.removeItem("speakoutOnboarding");}
}

async function handleLogout(event){
  event?.preventDefault();
  sessionStorage.setItem("speakoutManualLogout","true");
  ["speakoutRole","speakoutUser","speakoutSchoolCode","speakoutSchoolName"].forEach(key=>localStorage.removeItem(key));
  await signOut(auth);
  window.location.replace(projectUrl("auth.html?loggedOut=1"));
}

byId("forgotPasswordLink")?.addEventListener("click",async event=>{
  event.preventDefault();
  const email=value("loginEmail");
  if(!email){showLogin("Enter your email address above, then select Forgot password again.","warning");return;}
  try{
    showLogin("Sending password reset instructions...");
    await sendPasswordResetEmail(auth,email);
    showLogin("If an account exists for that email, password reset instructions have been sent.","success");
  }catch(error){
    console.error("Password reset error:",error);
    showLogin("Password reset could not be started. Please check your email and try again.","error");
  }
});

byId("loginForm")?.addEventListener("submit",handleLogin);
byId("registerForm")?.addEventListener("submit",handleRegister);
byId("schoolRegisterForm")?.addEventListener("submit",handleSchoolRegistration);
byId("schoolAdminActivateForm")?.addEventListener("submit",handleSchoolAdminActivation);
document.querySelectorAll("[data-logout],#logoutButton,#logoutBtn,.logout").forEach(button=>button.addEventListener("click",handleLogout));

const params=new URLSearchParams(location.search);
const invited=clean(params.get("schoolInvite"));
const querySchool=clean(params.get("school")).toUpperCase();
const queryRole=normalize(params.get("join"));

if(invited){
  selectPanel("schoolPanel");
  byId("schoolAdminActivation")?.classList.add("show");
}else if(querySchool||location.hash==="#join"){
  selectPanel("joinPanel");
}else if(location.hash==="#school"){
  selectPanel("schoolPanel");
}

if(queryRole&&byId("role")&&[...byId("role").options].some(option=>option.value===queryRole)){
  byId("role").value=queryRole;
}
if(querySchool&&byId("schoolCode")){
  byId("schoolCode").value=querySchool;
  resolveSchoolCode().catch(()=>{});
}

if(document.body?.dataset?.authPage==="auth"){
  onAuthStateChanged(auth,async user=>{
    const urlLoggedOut=params.get("loggedOut")==="1";
    const manualLogout=sessionStorage.getItem("speakoutManualLogout")==="true";
    const onboarding=sessionStorage.getItem("speakoutOnboarding")==="true";
    if(onboarding) return;
    if(urlLoggedOut||manualLogout){
      sessionStorage.removeItem("speakoutManualLogout");
      if(urlLoggedOut) showLogin("You have been logged out successfully.","success");
      return;
    }
    if(user) await redirectByUserRole(user);
  });
}

window.speakoutLogout=async()=>handleLogout();

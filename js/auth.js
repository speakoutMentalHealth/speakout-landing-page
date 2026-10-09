import { selectPanel } from "./auth-access.js";
import { isApprovedProfile } from "./profile-approval.js";
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
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
let googleUser=null;
let authActionInProgress=false;

function setGoogleProfileMode(user){
  googleUser=user;
  const active=Boolean(user);
  for(const id of ["password","confirmPassword"]){
    const input=byId(id);
    if(!input) continue;
    input.required=!active;
    input.disabled=active;
    input.value="";
    input.closest("label").hidden=active;
  }
  if(byId("email")){
    byId("email").readOnly=active;
    if(active) byId("email").value=user.email||"";
  }
  if(byId("googleProfileNote")) byId("googleProfileNote").hidden=!active;
  if(byId("cancelGoogleProfile")) byId("cancelGoogleProfile").hidden=!active;
  const submit=byId("registerForm")?.querySelector('[type="submit"]');
  if(submit) submit.textContent=active?"Submit application":"Create Account";
}

function beginGoogleProfile(user){
  sessionStorage.setItem("speakoutOnboarding","true");
  setGoogleProfileMode(user);
  const names=clean(user.displayName).split(/\s+/);
  if(!value("firstName")) byId("firstName").value=names[0]||"";
  if(!value("lastName")) byId("lastName").value=names.slice(1).join(" ");
  selectPanel("joinPanel");
  showRegister("Google account connected. Confirm your details, choose your role and accept the terms to submit your application.");
  byId("firstName")?.focus();
}

async function applyDevicePersistence(){
  const privateDevice=Boolean(byId("privateDevice")?.checked);
  await setPersistence(auth,privateDevice?browserLocalPersistence:browserSessionPersistence);
  if(privateDevice) localStorage.setItem("speakoutDeviceMode","private");
  else localStorage.removeItem("speakoutDeviceMode");
  sessionStorage.setItem("speakoutDeviceMode",privateDevice?"private":"shared");
  return privateDevice;
}

async function handleGoogleSignIn(){
  if(authActionInProgress) return;
  authActionInProgress=true;
  sessionStorage.setItem("speakoutOnboarding","true");
  sessionStorage.removeItem("speakoutManualLogout");
  const buttons=document.querySelectorAll("[data-google-signin]");
  buttons.forEach(button=>button.disabled=true);
  const message=byId("joinPanel")?.classList.contains("active")?showRegister:showLogin;
  try{
    await applyDevicePersistence();
    message("Connecting to Google...");
    const provider=new GoogleAuthProvider();
    provider.setCustomParameters({prompt:"select_account"});
    const credential=await signInWithPopup(auth,provider);
    if(!credential.user.email) throw new Error("Google did not provide an email address.");
    const profile=await getUserProfile(credential.user.uid);
    if(profile){
      sessionStorage.removeItem("speakoutOnboarding");
      setGoogleProfileMode(null);
      selectPanel("loginPanel");
      await redirectByUserRole(credential.user);
    }else beginGoogleProfile(credential.user);
  }catch(error){
    const messages={
      "auth/popup-closed-by-user":"Google sign-in was cancelled. You can try again.",
      "auth/cancelled-popup-request":"Another Google sign-in is already open.",
      "auth/popup-blocked":"Allow pop-ups for this site, then select Continue with Google again.",
      "auth/operation-not-allowed":"Google sign-in is not enabled yet. Please use email and password or contact SpeakOut.",
      "auth/unauthorized-domain":"Google sign-in is unavailable on this address. Please use the official SpeakOut website.",
      "auth/account-exists-with-different-credential":"This email already uses another sign-in method. Sign in using that method; contact SpeakOut if you need help.",
      "auth/network-request-failed":"Google sign-in could not connect. Check your internet connection and try again."
    };
    message(messages[error?.code]||"Google sign-in could not be completed. Please try again.","error");
    sessionStorage.removeItem("speakoutOnboarding");
    sessionStorage.setItem("speakoutManualLogout","true");
    try{await signOut(auth);}catch{}
    setGoogleProfileMode(null);
  }finally{
    authActionInProgress=false;
    buttons.forEach(button=>button.disabled=false);
  }
}

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

async function getUserProfile(uid){
  const snap=await getDoc(doc(db,"users",uid));
  return snap.exists()?{uid,...snap.data()}:null;
}

async function redirectByUserRole(user){
  const profile=await getUserProfile(user.uid);
  if(!profile){
    if(user.providerData?.some(provider=>provider.providerId==="google.com")){
      beginGoogleProfile(user);
      return;
    }
    showLogin("Your account exists, but your SpeakOut profile was not found. Please contact SpeakOut admin.","error");
    await signOut(auth);
    return;
  }
  const approved=isApprovedProfile(profile);
  if(!approved){
    const status=normalize(profile.status);
    const message=normalize(profile.schoolVerificationStatus)==="pending"
      ?"Your account is waiting for verification by your school administrator."
      :status==="suspended"
        ?"Your account is suspended. Please contact SpeakOut for assistance."
        :status==="rejected"
          ?"Your account is not approved. Please contact SpeakOut if you believe this is an error."
          :"Your account is pending approval.";
    showLogin(message,"warning");
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
    const privateDevice=await applyDevicePersistence();
    showLogin(privateDevice ? "Signing you in on this private device..." : "Signing you in securely for this session...");
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
  syncSchoolRoleFields();
}

function syncSchoolRoleFields(){
  const role=normalize(value("role"));
  const schoolLinked=Boolean(resolvedSchool);
  const student=role==="student"&&schoolLinked;
  const teacher=role==="teacher"&&schoolLinked;
  const parent=role==="parent"&&schoolLinked;

  const studentWrap=byId("studentVerificationFields");
  const teacherWrap=byId("teacherVerificationFields");
  const parentWrap=byId("parentVerificationFields");
  if(studentWrap) studentWrap.style.display=student?"block":"none";
  if(teacherWrap) teacherWrap.style.display=teacher?"block":"none";
  if(parentWrap) parentWrap.style.display=parent?"block":"none";

  const registrationNumber=byId("registrationNumber");
  const staffId=byId("staffId");
  const parentRelationship=byId("parentRelationship");
  if(registrationNumber) registrationNumber.required=student;
  if(staffId) staffId.required=teacher;
  if(parentRelationship) parentRelationship.required=parent;
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
    syncSchoolRoleFields();
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
byId("role")?.addEventListener("change",syncSchoolRoleFields);

async function createIndividualProfile(credential,data){
  const profileRef=doc(db,"users",credential.user.uid);
  await runTransaction(db,async transaction=>{
    const existing=await transaction.get(profileRef);
    if(existing.exists()) throw new Error("A SpeakOut profile already exists. Sign in to continue.");
    transaction.set(profileRef,{
    uid:credential.user.uid,
    ...data,
    status:"pending",
    approved:false,
    profileCompleted:false,
    createdAt:serverTimestamp(),
    updatedAt:serverTimestamp()
    });
  });
}

async function handleRegister(event){
  event.preventDefault();
  const firstName=value("firstName"), lastName=value("lastName"), fullName=`${firstName} ${lastName}`.trim();
  const email=value("email"), phone=value("phone"), password=value("password"), confirmPassword=value("confirmPassword");
  const role=normalize(value("role")||"student"), schoolCode=value("schoolCode").toUpperCase();
  const locationValue=value("location"), reason=value("reason"), contentType=value("contentType");
  const usingGoogle=Boolean(googleUser);
  if(usingGoogle&&auth.currentUser?.uid!==googleUser.uid){showRegister("Your Google session expired. Select Continue with Google again.","error");return;}
  if(!firstName||!lastName||!email||(!usingGoogle&&!password)){showRegister("Enter your name, email and sign-in details.","error");return;}
  if(!usingGoogle&&password.length<6){showRegister("Your password must contain at least 6 characters.","error");return;}
  if(!usingGoogle&&password!==confirmPassword){showRegister("Your passwords do not match.","error");return;}
  if(usingGoogle&&email!==googleUser.email){showRegister("Use the email supplied by your Google account.","error");return;}
  if(!byId("terms")?.checked){showRegister("Please confirm the terms before submitting.","error");return;}
  if(schoolCode&&(!resolvedSchool||resolvedCode!==schoolCode)){
    try{await resolveSchoolCode();}catch{showRegister("Verify your school code before creating the account.","error");return;}
  }
  const schoolLinked=Boolean(resolvedSchool);
  const registrationNumber=value("registrationNumber");
  const staffId=value("staffId");
  const parentRelationship=value("parentRelationship");
  if(schoolLinked&&!["student","teacher","parent"].includes(role)){
    showRegister("School-linked registration is available for students, teachers and parents/guardians. Choose the role that applies to you.","error");return;
  }
  if(schoolLinked&&role==="student"&&!registrationNumber){
    showRegister("Enter your student registration or matric number so your school can verify you.","error");return;
  }
  if(schoolLinked&&role==="teacher"&&!staffId){
    showRegister("Enter your Staff ID or Employee Number so your school can verify you.","error");return;
  }
  if(schoolLinked&&role==="parent"&&!parentRelationship){
    showRegister("Enter your relationship to the student so the school can verify your parent/guardian account.","error");return;
  }

  let credential=null;
  let profileCreated=false;
  sessionStorage.setItem("speakoutOnboarding","true");
  try{
    showRegister(schoolLinked?"Creating your account and linking your school...":"Creating your account...");
    credential=usingGoogle?{user:googleUser}:await createUserWithEmailAndPassword(auth,email,password);
    if(usingGoogle&&await getUserProfile(credential.user.uid)) throw new Error("A SpeakOut profile already exists. Sign in to continue.");
    if(schoolLinked){
      await onboardingApi.joinSchool({
        firstName,lastName,fullName,phone,role,schoolCode,
        registrationNumber,
        staffId,
        department:role==="teacher"?value("staffDepartment"):value("department"),
        level:role==="student"?value("level"):"",
        position:role==="teacher"?value("staffPosition"):"",
        relationship:role==="parent"?parentRelationship:"",
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
    setGoogleProfileMode(null);
    clearResolvedSchool();
  }catch(error){
    console.error("Registration error:",error);
    if(credential?.user&&!profileCreated&&!usingGoogle){
      try{await deleteUser(credential.user);}catch{}
    }
    const message=error?.code==="auth/email-already-in-use"
      ?"An account already exists with this email address."
      :error?.message||"Registration failed.";
    showRegister(message,"error");
  }finally{
    if(!googleUser) sessionStorage.removeItem("speakoutOnboarding");
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
    localStorage.removeItem("speakoutDeviceMode");
    sessionStorage.setItem("speakoutDeviceMode","shared");
    await setPersistence(auth,browserSessionPersistence);
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
  sessionStorage.removeItem("speakoutDeviceMode");
  ["speakoutRole","speakoutUser","speakoutSchoolCode","speakoutSchoolName","speakoutDeviceMode"].forEach(key=>localStorage.removeItem(key));
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
document.querySelectorAll("[data-google-signin]").forEach(button=>button.addEventListener("click",handleGoogleSignIn));
byId("cancelGoogleProfile")?.addEventListener("click",async()=>{
  sessionStorage.setItem("speakoutManualLogout","true");
  await signOut(auth);
  byId("registerForm")?.reset();
  setGoogleProfileMode(null);
  sessionStorage.removeItem("speakoutOnboarding");
  clearResolvedSchool();
  showRegister("Google profile setup cancelled. You can reconnect when ready.");
});
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
    if(authActionInProgress) return;
    const urlLoggedOut=params.get("loggedOut")==="1";
    const sessionExpired=params.get("sessionExpired")==="1";
    const manualLogout=sessionStorage.getItem("speakoutManualLogout")==="true";
    const onboarding=sessionStorage.getItem("speakoutOnboarding")==="true";
    if(onboarding){
      if(user?.providerData?.some(provider=>provider.providerId==="google.com")&&!googleUser){
        try{await redirectByUserRole(user);}catch{showRegister("Your account could not be loaded. Please try again.","error");}
      }
      return;
    }
    if(urlLoggedOut||sessionExpired||manualLogout){
      sessionStorage.removeItem("speakoutManualLogout");
      if(sessionExpired){
        showLogin("For shared-device safety, you were signed out after a period of inactivity. Sign in again to continue.","warning");
      }else if(urlLoggedOut){
        showLogin("You have been logged out successfully.","success");
      }
      return;
    }
    if(user) await redirectByUserRole(user);
  });
}

window.speakoutLogout=async()=>handleLogout();

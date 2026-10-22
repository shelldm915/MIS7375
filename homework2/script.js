/*
Program name: script.js
Author: Sheldon McNeal
Date created: 10/15/2026
Date last edited: 10/23/2026
Version: 2.1
Description: External JavaScript for MIS 7375 Homework 2 (homework2.html).
             - Shows today's date in the banner
             - Sets the min/max dates on the date fields from today's date
             - Checks each field when the user leaves it and writes an error beside it
             - Updates the slider value and the password rules live (oninput)
             - REVIEW button: checks every field and redisplays all entries with pass/ERROR
             - SUBMIT button: runs every check again before the form is sent
Version 2.1 (after the 10/19 lecture):
             - Form data is read by the NAME attribute (form.elements), not by ID.
               IDs are used only for page "scaffolding": the form, the error message spans,
               the slider label, the password checklist and the review area.
             - Check functions are sub-functions: they receive values as arguments and
               return a message. They never read or write the page themselves.
             - Variables are declared at the top with let/const; regular expressions are const.
AI disclosure: Drafted with assistance from Claude (Anthropic); reviewed and edited by Sheldon McNeal.
*/


/* =====================================================================
   1. GLOBAL VARIABLES AND CONSTANTS (declared once, at the top)
   ===================================================================== */

// Regular expression patterns. const because they never change.
const RE_FIRST_NAME = /^[A-Za-z'\-]{1,30}$/;            // letters, apostrophes, dashes
const RE_MIDDLE     = /^[A-Za-z]$/;                     // one letter
const RE_LAST_NAME  = /^[A-Za-z'2-5\-]{1,30}$/;         // letters, apostrophes, dashes, digits 2-5
const RE_SSN        = /^[0-9]{3}-?[0-9]{2}-?[0-9]{4}$/; // 9 digits, dashes optional
const RE_EMAIL      = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;  // name@domain.tld
const RE_PHONE      = /^[0-9]{3}-[0-9]{3}-[0-9]{4}$/;   // 000-000-0000
const RE_CITY       = /^[A-Za-z .'\-]{2,30}$/;          // letters, spaces, periods, dashes
const RE_ZIP        = /^[0-9]{5}(-[0-9]{4})?$/;         // 5 digits or zip+4
const RE_USER_ID    = /^[a-z_\-][a-z0-9_\-]{4,29}$/;    // 5-30, no leading number (checked after lowercasing)

// List of every field name on the form, in the order they appear (matches the data dictionary)
const FIELD_NAMES = ["first_name", "middle_initial", "last_name", "dob", "visit_date", "ssn",
                     "gender", "email", "phone", "address1", "address2", "city", "state", "zip",
                     "returning_patient", "has_insurance", "flu_vaccine", "symptoms",
                     "user_id", "password", "password_confirm"];

// Checkbox names and the label to show for each one in the review
const HISTORY_BOXES = [["hx_asthma", "Asthma"], ["hx_diabetes", "Diabetes"],
                       ["hx_high_bp", "High blood pressure"], ["hx_heart", "Heart disease"],
                       ["hx_drug_allergy", "Medication allergy"], ["hx_covid", "COVID-19"]];

let form = document.getElementById("patientForm");   // the form container (scaffolding, so ID is right)
let dateToday = new Date();                           // today's date from the browser
let dateStartOfToday = new Date(dateToday.getFullYear(), dateToday.getMonth(), dateToday.getDate());
let dateOldestDob = new Date(dateToday.getFullYear() - 120, dateToday.getMonth(), dateToday.getDate());
let dateLastVisit = new Date(dateToday.getFullYear(), dateToday.getMonth(), dateToday.getDate() + 30);


/* =====================================================================
   2. RUN ON PAGE LOAD
   "defer" in the script tag means this runs after the HTML is built.
   ===================================================================== */

// Banner date, e.g. "Thursday, October 15, 2026"
document.getElementById("today").innerHTML = dateToday.toLocaleDateString("en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" });

// Date of birth: no future dates and nothing more than 120 years ago
form.elements["dob"].min = toInputDate(dateOldestDob);
form.elements["dob"].max = toInputDate(dateToday);

// Preferred visit date: today through 30 days from now, no past dates
form.elements["visit_date"].min = toInputDate(dateToday);
form.elements["visit_date"].max = toInputDate(dateLastVisit);

// Show the slider's starting value
showPain();


/* =====================================================================
   3. GETTING DATA OFF THE FORM (by name)
   ===================================================================== */

// Read every field by its name attribute and return one object holding all the values.
// Radio groups share one name, so form.elements["gender"].value is the checked choice ("" if none).
function getFormData() {
    let data = {};
    let i;
    for (i = 0; i < FIELD_NAMES.length; i++) {
        let fieldName = FIELD_NAMES[i];
        let value = form.elements[fieldName].value;
        // Trim spaces from everything except the passwords and the symptoms box
        if (fieldName !== "password" && fieldName !== "password_confirm" && fieldName !== "symptoms") {
            value = value.trim();
        }
        data[fieldName] = value;
    } // end for each field name
    data["pain_level"] = Number(form.elements["pain_level"].value);
    for (i = 0; i < HISTORY_BOXES.length; i++) {
        data[HISTORY_BOXES[i][0]] = form.elements[HISTORY_BOXES[i][0]].checked ? "Y" : "N";
    } // end for each checkbox
    return data;
} // end getFormData

// Fix values the user is allowed to enter loosely, and put the fixed value back in the box:
// user ID becomes lowercase, and a valid zip+4 is trimmed to 5 digits.
function normalizeFields() {
    let userBox = form.elements["user_id"];
    userBox.value = userBox.value.trim().toLowerCase();
    let zipBox = form.elements["zip"];
    let zip = zipBox.value.trim();
    if (RE_ZIP.test(zip) && zip.length > 5) {
        zipBox.value = zip.substring(0, 5);
    } // end if zip+4
} // end normalizeFields


/* =====================================================================
   4. SMALL HELPER FUNCTIONS
   ===================================================================== */

// Date object -> "YYYY-MM-DD" (the format date inputs use)
function toInputDate(d) {
    let mm = String(d.getMonth() + 1).padStart(2, "0");
    let dd = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mm + "-" + dd;
} // end toInputDate

// "YYYY-MM-DD" -> "MM/DD/YYYY" for display
function toDisplayDate(value) {
    if (value === "") { return ""; }
    let parts = value.split("-");
    return parts[1] + "/" + parts[2] + "/" + parts[0];
} // end toDisplayDate

// "YYYY-MM-DD" -> Date object at local midnight
function toDateObject(value) {
    let parts = value.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
} // end toDateObject

// Make user-typed text safe to put into HTML (typing <b> shows as text, not bold)
function safe(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
} // end safe

// Write an error message beside a field, or clear it when msg is "".
// The message span is scaffolding, so it is found by ID (err_ + field name).
function showError(fieldName, msg) {
    let span = document.getElementById("err_" + fieldName);
    if (span) { span.innerHTML = msg; }
    let field = form.elements[fieldName];
    if (field && field.classList) {               // radio groups have no single box to outline
        if (msg === "") { field.classList.remove("invalid"); }
        else { field.classList.add("invalid"); }
    } // end if field can be outlined
} // end showError


/* =====================================================================
   5. CHECK SUB-FUNCTIONS
   Each one receives the value(s) it needs and returns "" if good,
   or an error message. None of them touch the page.
   ===================================================================== */

function checkFirstName(value) {
    if (value === "") { return "First name is required."; }
    if (!RE_FIRST_NAME.test(value)) { return "First name: 1-30 letters, apostrophes and dashes only."; }
    return "";
} // end checkFirstName

function checkMiddleInitial(value) {
    if (value === "") { return ""; }              // optional
    if (!RE_MIDDLE.test(value)) { return "MI: one letter only."; }
    return "";
} // end checkMiddleInitial

function checkLastName(value) {
    if (value === "") { return "Last name is required."; }
    if (!RE_LAST_NAME.test(value)) { return "Last name: 1-30 letters, apostrophes, dashes and numbers 2-5 only."; }
    return "";
} // end checkLastName

function checkDob(value) {
    if (value === "") { return "Date of birth is required."; }
    let dateDob = toDateObject(value);
    if (dateDob > dateToday) { return "Date of birth cannot be in the future."; }
    if (dateDob < dateOldestDob) { return "Date of birth cannot be more than 120 years ago."; }
    return "";
} // end checkDob

function checkVisitDate(value) {
    if (value === "") { return "Visit date is required."; }
    let dateVisit = toDateObject(value);
    if (dateVisit < dateStartOfToday) { return "Visit date cannot be in the past."; }
    if (dateVisit > dateLastVisit) { return "Visit date must be within the next 30 days."; }
    return "";
} // end checkVisitDate

function checkSsn(value) {
    if (value === "") { return "Social Security number is required."; }
    if (!RE_SSN.test(value)) { return "SSN: 9 digits, as ###-##-#### or #########."; }
    return "";
} // end checkSsn

function checkEmail(value) {
    if (value === "") { return "Email is required."; }
    if (!RE_EMAIL.test(value)) { return "Email must look like name@domain.tld"; }
    return "";
} // end checkEmail

function checkPhone(value) {
    if (value === "") { return "Phone is required."; }
    if (!RE_PHONE.test(value)) { return "Phone must be 000-000-0000."; }
    return "";
} // end checkPhone

function checkAddress1(value) {
    if (value === "") { return "Address line 1 is required."; }
    if (value.length < 2 || value.length > 30) { return "Address line 1: 2 to 30 characters."; }
    return "";
} // end checkAddress1

function checkAddress2(value) {
    if (value === "") { return ""; }              // optional
    if (value.length < 2 || value.length > 30) { return "Address line 2: 2 to 30 characters if used."; }
    return "";
} // end checkAddress2

function checkCity(value) {
    if (value === "") { return "City is required."; }
    if (!RE_CITY.test(value)) { return "City: 2-30 letters, spaces, periods and dashes."; }
    return "";
} // end checkCity

function checkState(value) {
    if (value === "") { return "Please choose a state."; }
    return "";
} // end checkState

function checkZip(value) {
    if (value === "") { return "Zip code is required."; }
    if (!RE_ZIP.test(value)) { return "Zip: 5 digits, or zip+4 as #####-####."; }
    return "";
} // end checkZip

function checkSymptoms(value) {
    if (value.indexOf('"') >= 0) { return "Please remove double quotes (\") from symptoms."; }
    return "";
} // end checkSymptoms

function checkRadio(value, label) {
    if (value === "") { return "Please answer: " + label + "."; }
    return "";
} // end checkRadio

function checkUserId(value) {
    // value has already been lowercased by normalizeFields()
    if (value === "") { return "User ID is required."; }
    if (value.length < 5 || value.length > 30) { return "User ID: 5 to 30 characters."; }
    if (/\s/.test(value)) { return "User ID: no spaces."; }
    if (/^[0-9]/.test(value)) { return "User ID cannot start with a number."; }
    if (!RE_USER_ID.test(value)) { return "User ID: letters, numbers, underscore and dash only."; }
    return "";
} // end checkUserId

// Test each password rule and return true/false for each (used by the checklist and the check)
function passwordRules(pw, userId, firstName, lastName) {
    let lowerPw = pw.toLowerCase();
    let containsName = false;
    if (userId.length > 0 && lowerPw.indexOf(userId.toLowerCase()) >= 0) { containsName = true; }
    if (firstName.length > 1 && lowerPw.indexOf(firstName.toLowerCase()) >= 0) { containsName = true; }
    if (lastName.length > 1 && lowerPw.indexOf(lastName.toLowerCase()) >= 0) { containsName = true; }
    return {
        length:  pw.length >= 8 && pw.length <= 30,
        upper:   /[A-Z]/.test(pw),
        lower:   /[a-z]/.test(pw),
        digit:   /[0-9]/.test(pw),
        special: /[^A-Za-z0-9\s"]/.test(pw),
        noquote: pw.length > 0 && !/["\s]/.test(pw),
        noname:  pw.length > 0 && !containsName
    };
} // end passwordRules

function checkPassword(pw, userId, firstName, lastName) {
    if (pw === "") { return "Password is required."; }
    let r = passwordRules(pw, userId, firstName, lastName);
    if (!r.length)  { return "Password: 8 to 30 characters."; }
    if (!r.upper)   { return "Password needs an uppercase letter."; }
    if (!r.lower)   { return "Password needs a lowercase letter."; }
    if (!r.digit)   { return "Password needs a number."; }
    if (!r.special) { return "Password needs a special character."; }
    if (!r.noquote) { return "Password cannot contain double quotes or spaces."; }
    if (!r.noname)  { return "Password cannot contain your user ID or name."; }
    return "";
} // end checkPassword

function checkPasswordConfirm(pw, pw2) {
    if (pw2 === "") { return "Please re-enter your password."; }
    if (pw !== pw2) { return "Passwords do not match."; }
    return "";
} // end checkPasswordConfirm


/* =====================================================================
   6. ROUTER: pick the right check for a field name
   ===================================================================== */

// Returns the error message for one field, using the values in data
function validate(fieldName, data) {
    switch (fieldName) {
        case "first_name":        return checkFirstName(data.first_name);
        case "middle_initial":    return checkMiddleInitial(data.middle_initial);
        case "last_name":         return checkLastName(data.last_name);
        case "dob":               return checkDob(data.dob);
        case "visit_date":        return checkVisitDate(data.visit_date);
        case "ssn":               return checkSsn(data.ssn);
        case "email":             return checkEmail(data.email);
        case "phone":             return checkPhone(data.phone);
        case "address1":          return checkAddress1(data.address1);
        case "address2":          return checkAddress2(data.address2);
        case "city":              return checkCity(data.city);
        case "state":             return checkState(data.state);
        case "zip":               return checkZip(data.zip);
        case "symptoms":          return checkSymptoms(data.symptoms);
        case "user_id":           return checkUserId(data.user_id);
        case "password":          return checkPassword(data.password, data.user_id, data.first_name, data.last_name);
        case "password_confirm":  return checkPasswordConfirm(data.password, data.password_confirm);
        case "gender":            return checkRadio(data.gender, "gender");
        case "returning_patient": return checkRadio(data.returning_patient, "visited before");
        case "has_insurance":     return checkRadio(data.has_insurance, "health insurance");
        case "flu_vaccine":       return checkRadio(data.flu_vaccine, "flu shot");
        default:                  return "";      // unknown field: nothing to check
    } // end switch
} // end validate

// Called from the HTML (onblur / onchange / oninput) with the field's name.
// Checks that one field and shows the result beside it. Returns true if good.
function checkField(fieldName) {
    normalizeFields();
    let data = getFormData();
    let msg = validate(fieldName, data);
    showError(fieldName, msg);
    return msg === "";
} // end checkField

// Checks every field, shows each result beside its field, and returns true only if all pass
function checkAllFields() {
    normalizeFields();
    let data = getFormData();
    let allGood = true;
    let i;
    for (i = 0; i < FIELD_NAMES.length; i++) {
        let msg = validate(FIELD_NAMES[i], data);
        showError(FIELD_NAMES[i], msg);
        if (msg !== "") { allGood = false; }
    } // end for each field
    return allGood;
} // end checkAllFields


/* =====================================================================
   7. LIVE (oninput) FUNCTIONS
   ===================================================================== */

// Slider: a word for each pain level
function painWord(n) {
    switch (true) {
        case n === 0: return "No pain";
        case n <= 3:  return "Mild";
        case n <= 6:  return "Moderate";
        case n <= 9:  return "Severe";
        default:      return "Worst possible";
    } // end switch
} // end painWord

// Show the number and word next to the slider
function showPain() {
    let n = Number(form.elements["pain_level"].value);
    document.getElementById("pain_display").innerHTML = n + " - " + painWord(n);
} // end showPain

// Password: turn each rule green or red as the user types
function checkPasswordLive() {
    let data = getFormData();
    let r = passwordRules(data.password, data.user_id, data.first_name, data.last_name);
    const RULE_KEYS = ["length", "upper", "lower", "digit", "special", "noquote", "noname"];
    let i;
    for (i = 0; i < RULE_KEYS.length; i++) {
        let li = document.getElementById("rule_" + RULE_KEYS[i]);
        li.className = r[RULE_KEYS[i]] ? "rule-ok" : "rule-bad";
    } // end for each rule
    // If the re-enter box already has something in it, compare again
    if (data.password_confirm !== "") {
        checkField("password_confirm");
    } // end if confirm not empty
} // end checkPasswordLive


/* =====================================================================
   8. REVIEW BUTTON
   One button that checks every field AND redisplays everything,
   with pass or ERROR beside each line. Does not submit the form.
   ===================================================================== */

// Build one row of the review table
function reviewRow(label, value, msg) {
    let status = (msg === "")
        ? '<span class="pass">pass</span>'
        : '<span class="fail">ERROR: ' + msg + '</span>';
    return "<tr><td class='rv-label'>" + label + "</td><td class='rv-value'>" + value +
           "</td><td class='rv-status'>" + status + "</td></tr>";
} // end reviewRow

// Join several error messages into one line (skips the blank ones)
function combine(list) {
    let out = [];
    let i;
    for (i = 0; i < list.length; i++) {
        if (list[i] !== "") { out.push(list[i]); }
    } // end for
    return out.join(" ");
} // end combine

function reviewForm() {
    checkAllFields();                 // updates every message beside the fields
    let data = getFormData();         // read the (normalized) values by name
    let html = "";
    let i;

    // Name, SSN (last 4 only), address and email display values
    let nameShown = safe(data.first_name + " " + data.middle_initial + " " + data.last_name);
    let nameMsg = combine([validate("first_name", data), validate("middle_initial", data), validate("last_name", data)]);
    let ssnDigits = data.ssn.replace(/-/g, "");
    let ssnShown = ssnDigits.length >= 4 ? "***-**-" + safe(ssnDigits.slice(-4)) : "";
    let addrShown = safe(data.address1);
    if (data.address2 !== "") { addrShown += "<br />" + safe(data.address2); }
    addrShown += "<br />" + safe(data.city) + ", " + safe(data.state) + " " + safe(data.zip);
    let addrMsg = combine([validate("address1", data), validate("address2", data),
                           validate("city", data), validate("state", data), validate("zip", data)]);
    let emailShown = data.email !== "" ? '<a href="mailto:' + safe(data.email) + '">' + safe(data.email) + "</a>" : "";
    let symptomsShown = data.symptoms.trim() === "" ? "<em>(none entered)</em>" : safe(data.symptoms);

    html += "<h3>PLEASE REVIEW THIS INFORMATION</h3><table class='review-table'>";
    html += reviewRow("First, MI, Last Name", nameShown, nameMsg);
    html += reviewRow("Date of Birth", toDisplayDate(data.dob), validate("dob", data));
    html += reviewRow("Preferred Visit Date", toDisplayDate(data.visit_date), validate("visit_date", data));
    html += reviewRow("Social Security #", ssnShown, validate("ssn", data));
    html += reviewRow("Gender", safe(data.gender), validate("gender", data));
    html += reviewRow("Email Address", emailShown, validate("email", data));
    html += reviewRow("Phone Number", safe(data.phone), validate("phone", data));
    html += reviewRow("Address", addrShown, addrMsg);
    html += "</table>";

    html += "<h3>REQUESTED INFO</h3><table class='review-table'>";
    html += reviewRow("Visited before?", safe(data.returning_patient), validate("returning_patient", data));
    html += reviewRow("Health insurance?", safe(data.has_insurance), validate("has_insurance", data));
    html += reviewRow("Flu shot this season?", safe(data.flu_vaccine), validate("flu_vaccine", data));
    html += reviewRow("Pain level indicated", data.pain_level + " - " + painWord(data.pain_level).toUpperCase(), "");
    for (i = 0; i < HISTORY_BOXES.length; i++) {
        html += reviewRow(HISTORY_BOXES[i][1], data[HISTORY_BOXES[i][0]], "");
    } // end for each checkbox
    html += reviewRow("Described symptoms", symptomsShown, validate("symptoms", data));
    html += "</table>";

    html += "<h3>PORTAL LOGIN</h3><table class='review-table'>";
    html += reviewRow("User ID", safe(data.user_id), validate("user_id", data));
    html += reviewRow("Password", "*".repeat(data.password.length) + " <em>(hidden for security)</em>", validate("password", data));
    html += reviewRow("Passwords match", "", validate("password_confirm", data));
    html += "</table>";

    // The review area is scaffolding, so it is found by ID
    let area = document.getElementById("reviewArea");
    area.innerHTML = html;
    area.style.display = "block";
    area.scrollIntoView({ behavior: "smooth" });
} // end reviewForm


/* =====================================================================
   9. SUBMIT and RESET
   ===================================================================== */

// Called by onsubmit. The browser has already checked the HTML attributes
// (required, pattern, min, max). This runs the JavaScript checks HTML cannot do,
// like comparing the two passwords. Returning false stops the submit.
function validateAll() {
    let allGood = checkAllFields();
    if (!allGood) {
        alert("Please fix the fields marked in red before submitting.");
        reviewForm();
    } // end if errors
    return allGood;
} // end validateAll

// Called by onreset. Clears the messages, the review area and the password checklist.
function clearAll() {
    let i;
    let spans = document.querySelectorAll(".error");
    for (i = 0; i < spans.length; i++) { spans[i].innerHTML = ""; }
    let bad = document.querySelectorAll(".invalid");
    for (i = 0; i < bad.length; i++) { bad[i].classList.remove("invalid"); }
    let rules = document.querySelectorAll("#pw_rules li");
    for (i = 0; i < rules.length; i++) { rules[i].className = ""; }
    let area = document.getElementById("reviewArea");
    area.innerHTML = "";
    area.style.display = "none";
    // The reset happens after this function finishes, so update the slider label a moment later
    setTimeout(showPain, 0);
} // end clearAll

/* End of script.js */

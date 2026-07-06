// Initialize User and Session IDs
let userId = localStorage.getItem("wearedata_user_id");
if (!userId) {
    userId = "user_" + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("wearedata_user_id", userId);
}

let sessionId = "session_" + Math.random().toString(36).substring(2, 15);

// DOM Elements
const btnTabUrl = document.getElementById("btn-tab-url");
const btnTabText = document.getElementById("btn-tab-text");
const tabUrl = document.getElementById("tab-url");
const tabText = document.getElementById("tab-text");
const btnAnalyze = document.getElementById("btn-analyze");
const inputSection = document.getElementById("input-section");
const analysisLoader = document.getElementById("analysis-loader");
const resultsSection = document.getElementById("results-section");
const progressFill = document.getElementById("progress-fill");
const progressStep = document.getElementById("progress-step");

const resultServiceName = document.getElementById("result-service-name");
const overallRiskBadge = document.getElementById("overall-risk-badge");
const overallRiskText = document.getElementById("overall-risk-text");
const btnReanalyze = document.getElementById("btn-reanalyze");

// New DOM Elements for Navigation & Rescan
const navBtnAnalyze = document.getElementById("nav-btn-analyze");
const navBtnAbout = document.getElementById("nav-btn-about");
const aboutSection = document.getElementById("about-section");
const btnRescan = document.getElementById("btn-rescan");
const labelLastScanned = document.getElementById("label-last-scanned");

let activeTab = "tab-url";
let analysisResult = null;

// Navigation Panel Switching
navBtnAnalyze.addEventListener("click", () => {
    navBtnAnalyze.classList.add("active");
    navBtnAbout.classList.remove("active");
    aboutSection.classList.add("hidden");
    inputSection.classList.remove("hidden");
    if (analysisResult) {
        resultsSection.classList.remove("hidden");
    }
});

navBtnAbout.addEventListener("click", () => {
    navBtnAbout.classList.add("active");
    navBtnAnalyze.classList.remove("active");
    aboutSection.classList.remove("hidden");
    inputSection.classList.add("hidden");
    resultsSection.classList.add("hidden");
});

// Tab Selection Logic
btnTabUrl.addEventListener("click", () => {
    btnTabUrl.classList.add("active");
    btnTabText.classList.remove("active");
    tabUrl.classList.add("active");
    tabText.classList.remove("active");
    activeTab = "tab-url";
});

btnTabText.addEventListener("click", () => {
    btnTabText.classList.add("active");
    btnTabUrl.classList.remove("active");
    tabText.classList.add("active");
    tabUrl.classList.remove("active");
    activeTab = "tab-text";
});

// Run Ethical Analysis
btnAnalyze.addEventListener("click", async () => {
    let inputText = "";
    if (activeTab === "tab-url") {
        const urlInput = document.getElementById("service-url");
        if (!urlInput.value.trim()) {
            alert("Please enter a service name (e.g. 'TikTok') or a valid URL.");
            return;
        }
        inputText = urlInput.value.trim();
    } else {
        const textInput = document.getElementById("policy-text-content");
        if (!textInput.value.trim()) {
            alert("Please paste some terms of service or privacy policy text.");
            return;
        }
        inputText = textInput.value.trim();
    }

    // Reset session ID to make sure each run is fresh
    sessionId = "session_" + Math.random().toString(36).substring(2, 15);

    // Transition to Loading State (but DO NOT hide inputSection)
    resultsSection.classList.add("hidden");
    analysisLoader.classList.remove("hidden");
    analysisLoader.scrollIntoView({ behavior: "smooth" });
    
    // Simulate progress updates for sub-agents (UX optimization)
    updateProgress(10, "Extracting policy document...");
    const progressInterval = setInterval(() => {
        const randomSteps = [
            { p: 25, msg: "Scrubbing headers and extracting content..." },
            { p: 40, msg: "Analyzing Data Collection & Sharing practices (DataSpy sub-agent)..." },
            { p: 55, msg: "Checking for dark patterns & opt-out mechanisms (ConsentWatch sub-agent)..." },
            { p: 70, msg: "Scanning youth safety compliance & COPPA rules (YouthGuard sub-agent)..." },
            { p: 85, msg: "Assessing algorithmic profiling & mental health impacts..." },
            { p: 95, msg: "Compiling final ethics report..." }
        ];
        const currentP = parseInt(progressFill.style.width);
        const nextStep = randomSteps.find(s => s.p > currentP);
        if (nextStep) {
            updateProgress(nextStep.p, nextStep.msg);
        }
    }, 3000);

    try {
        // 1. Create/Initialize session first
        const createSessionResponse = await fetch(`/apps/app/users/${userId}/sessions/${sessionId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({})
        });

        if (!createSessionResponse.ok) {
            throw new Error(`Failed to initialize session: ${createSessionResponse.status}`);
        }

        // 2. Call FastAPI Backend run endpoint
        const response = await fetch("/run", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                appName: "app",
                userId: userId,
                sessionId: sessionId,
                newMessage: {
                    role: "user",
                    parts: [{ text: inputText }]
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Server returned error status: ${response.status}`);
        }

        const events = await response.json();
        clearInterval(progressInterval);
        updateProgress(100, "Analysis complete!");

        // Retrieve the session state details to get structured scores
        await fetchAndDisplayReport(events);

    } catch (error) {
        clearInterval(progressInterval);
        console.error("Error during analysis:", error);
        alert("An error occurred during the analysis: " + error.message);
        // Fallback: hide loader
        analysisLoader.classList.add("hidden");
    }
});

function updateProgress(percent, message) {
    progressFill.style.width = `${percent}%`;
    progressStep.textContent = message;
}

// Fetch and display results
async function fetchAndDisplayReport(events) {
    try {
        // Fetch session state details from ADK session endpoint
        const sessionRes = await fetch(`/apps/app/users/${userId}/sessions/${sessionId}`);
        if (!sessionRes.ok) {
            throw new Error("Could not retrieve session state details.");
        }
        const sessionData = await sessionRes.json();
        const state = sessionData.state || {};
        
        analysisResult = {
            serviceName: state.service_name || "Technology Service",
            data_collection: state.data_collection_result,
            consent: state.consent_result,
            youth_safety: state.youth_safety_result,
            algorithmic_bias: state.algorithmic_bias_result,
            mental_health: state.mental_health_result,
            scan_status: state.scan_status || "ok",
            last_scanned_at: state.last_scanned_at || "",
            privacy_email: state.privacy_email || "not_found"
        };

        displayResults(analysisResult);

    } catch (e) {
        console.error("Error fetching session state, falling back to manual event parsing", e);
        const reportEvent = events.find(e => e.author === "report_builder");
        if (reportEvent && reportEvent.content && reportEvent.content.parts) {
            const rawReport = reportEvent.content.parts.map(p => p.text).join("");
            parseAndDisplayMarkdownReport(rawReport);
        } else {
            alert("Could not process analysis report.");
            analysisLoader.classList.add("hidden");
        }
    }
}

// Exporter Helper Functions
function getGoogleCalendarLink(title, details) {
    const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";
    const text = encodeURIComponent("Privacy Action: " + title);
    const detailsParam = encodeURIComponent(details);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const startStr = tomorrow.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    tomorrow.setMinutes(30);
    const endStr = tomorrow.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    
    return `${baseUrl}&text=${text}&details=${detailsParam}&dates=${startStr}/${endStr}`;
}

function downloadIcsFile(title, details) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const startStr = tomorrow.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    tomorrow.setMinutes(30);
    const endStr = tomorrow.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//WeAreData//Ethical Tech Analyzer//EN",
        "BEGIN:VEVENT",
        `SUMMARY:Privacy Action: ${title}`,
        `DESCRIPTION:${details.replace(/\n/g, "\\n")}`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wearedata_mitigation_${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Checklist Persistence Functions
function saveChecklistState(serviceName) {
    const checkboxes = document.querySelectorAll(".todo-checkbox");
    const checkedIndices = [];
    checkboxes.forEach((cb, idx) => {
        if (cb.checked) {
            checkedIndices.push(idx);
        }
    });
    localStorage.setItem(`wearedata_todo_${serviceName.toLowerCase()}`, JSON.stringify(checkedIndices));
}

function loadChecklistState(serviceName) {
    const stored = localStorage.getItem(`wearedata_todo_${serviceName.toLowerCase()}`);
    if (!stored) return;
    try {
        const checkedIndices = JSON.parse(stored);
        const checkboxes = document.querySelectorAll(".todo-checkbox");
        checkboxes.forEach((cb, idx) => {
            if (checkedIndices.includes(idx)) {
                cb.checked = true;
            }
        });
    } catch (e) {
        console.error("Error loading checklist state:", e);
    }
}

// Render dynamic results
function displayResults(data) {
    // Hide Loader & Show Results (leaving inputSection visible)
    analysisLoader.classList.add("hidden");
    resultsSection.classList.remove("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth" });

    resultServiceName.textContent = data.serviceName;
    
    // Display Last Scanned Timestamp
    if (labelLastScanned) {
        labelLastScanned.textContent = data.last_scanned_at ? `Last Scanned: ${data.last_scanned_at}` : "Analyzed Service";
    }

    // Display Scan Status Warnings
    removeStatusBanner();
    if (data.scan_status === "partial") {
        showStatusBanner("⚠️ The policy document is extremely long. The analysis was completed using key core text segments. Users should verify key clauses independently by checking the official documentation.", "var(--risk-yellow)");
    } else if (data.scan_status === "not_found") {
        showStatusBanner("❌ A direct privacy policy link could not be located. Analyzing via our curated offline templates database (compiled from public legal frameworks, NOT harvested from users). Users should verify terms independently.", "var(--risk-red)");
    } else if (data.scan_status === "error") {
        showStatusBanner("❌ Scraper fetch failed (blocked by service CDN or request timeout). Analyzing via our curated offline templates database (compiled from public legal frameworks, NOT harvested from users). Users should verify terms independently.", "var(--risk-red)");
    }

    // Fill each domain card
    const domains = ["data_collection", "consent", "youth_safety", "algorithmic_bias", "mental_health"];
    let redCount = 0;
    let yellowCount = 0;
    let allMitigations = [];
    let flaggedDomainsText = [];

    const domainsFriendly = {
        "data_collection": "Data Collection & Sharing",
        "consent": "Consent & Transparency",
        "youth_safety": "Youth Safety (COPPA)",
        "algorithmic_bias": "Algorithmic Bias",
        "mental_health": "Mental Health Impact"
    };

    const domainDetails = {
        "Data Collection & Sharing": {
            why: "Data Collection audits reveal that this service tracks physical coordinates, hardware identifiers, or browsing histories, which are often commodified or shared with data brokers.",
            action: "Open your device OS settings (Privacy & Security), restrict background permissions for this app, reset advertising IDs, and toggle off 'share telemetry'."
        },
        "Consent & Transparency": {
            why: "The platform utilizes misdirection, pre-checked parameters, or dense jargon to obtain legal consent silently (dark patterns).",
            action: "Go to your app profile account settings, click 'Privacy Center', and manually toggle off third-party marketing, cookies, and partner sharing options."
        },
        "Youth Safety (COPPA)": {
            why: "COPPA or minor protections are weak, lacking verifiable parental consent protocols and raising profiling concerns.",
            action: "Toggle on minor safety settings, enable parent-mediated profile controls, and request deletion of historical browsing metadata."
        },
        "Algorithmic Bias": {
            why: "The platform builds a profiling matrix to tailor feedback feeds, locking you in biased bubbles or polar content circles.",
            action: "Disable feed customization, reset algorithm history logs, or switch search preferences to date-ordered rather than profile-customized feeds."
        },
        "Mental Health Impact": {
            why: "Design choices like auto-play loops, pull-to-refresh feeds, and random pop-up logs bypass human self-control to maximize session counts.",
            action: "Install operating system caps (Screen Time / Wellbeing boundaries), turn off push notifications, and disable auto-play loops inside service playback settings."
        }
    };

    domains.forEach(d => {
        const assessment = data[d] || { score: "GREEN", justification: "No concerns found.", mitigations: ["No actions needed."], evidence: [] };
        const score = assessment.score || "GREEN";
        
        if (score === "RED") redCount++;
        if (score === "YELLOW") yellowCount++;

        // Update card border & badge styling
        const card = document.getElementById(`card-${d}`);
        const pill = document.getElementById(`pill-${d}`);
        const brief = document.getElementById(`brief-${d}`);
        const justification = document.getElementById(`just-${d}`);
        const eList = document.getElementById(`evidence-${d}`);

        card.className = `ethics-card card-risk-${score.toLowerCase()}`;
        pill.className = `risk-pill badge-${score.toLowerCase()}`;
        pill.textContent = score;

        // Clean up formatting
        brief.textContent = assessment.justification.split(".")[0] + ".";
        justification.textContent = assessment.justification;

        // Populates evidence snippets
        if (eList) {
            eList.innerHTML = "";
            const evidence = Array.isArray(assessment.evidence) ? assessment.evidence : (assessment.evidence ? [assessment.evidence] : []);
            const validEvidence = evidence.filter(e => e && e !== "None" && e !== "No concerns");
            
            if (validEvidence.length === 0 || score === "GREEN") {
                eList.innerHTML = "<li>No specific risk-grounding clauses flagged.</li>";
            } else {
                validEvidence.forEach(e => {
                    const li = document.createElement("li");
                    li.textContent = e;
                    eList.appendChild(li);
                });
            }
        }

        // Collect mitigations for the bottom list
        const mits = Array.isArray(assessment.mitigations) ? assessment.mitigations : [assessment.mitigations];
        mits.forEach(m => {
            if (m && m !== "No action required." && m !== "No actions needed.") {
                allMitigations.push({ task: m, domain: domainsFriendly[d], score: score });
            }
        });

        // Collect flagged domains for advocacy email
        if (score === "RED" || score === "YELLOW") {
            flaggedDomainsText.push(`- ${domainsFriendly[d]} (Rating: ${score} - ${assessment.justification.split(".")[0]})`);
        }
    });

    // Populate bottom To-Do List with full action details
    const todoList = document.getElementById("mitigation-todo-list");
    todoList.innerHTML = "";
    if (allMitigations.length === 0) {
        todoList.innerHTML = '<p class="todo-empty-message">No actions required.</p>';
    } else {
        allMitigations.forEach((item, index) => {
            const div = document.createElement("div");
            div.className = "todo-item";
            
            const uniqueId = `todo-check-${index}`;
            const detail = domainDetails[item.domain] || { why: "", action: "" };
            const gcalLink = getGoogleCalendarLink(item.task, `Recommended privacy mitigation step for ${data.serviceName} (${item.domain}).\nWhy: ${detail.why}\nHow: ${detail.action}`);
            
            div.innerHTML = `
                <div class="todo-left" style="align-items: flex-start; flex-direction: column; gap: 0.25rem; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; width: 100%;">
                        <input type="checkbox" id="${uniqueId}" class="todo-checkbox" style="margin-top: 3px;">
                        <span class="todo-domain-tag badge-${item.score.toLowerCase()}" style="font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 4px; line-height: 1;">${item.domain}</span>
                        <label for="${uniqueId}" class="todo-text" style="font-weight: 600; cursor: pointer;">${item.task}</label>
                    </div>
                    <div class="todo-meta-details" style="padding-left: 2rem; margin-top: 0.4rem; font-size: 0.85rem; color: var(--text-dimmed); display: flex; flex-direction: column; gap: 0.35rem;">
                        <span style="line-height: 1.35;">🔍 <strong>Why it matters:</strong> ${detail.why}</span>
                        <span style="line-height: 1.35;">🛠️ <strong>How to do it:</strong> ${detail.action}</span>
                    </div>
                </div>
                <div class="todo-actions" style="align-self: center; margin-left: 1rem;">
                    <a href="${gcalLink}" class="btn-task-export btn-google" target="_blank" title="Add to Google Calendar">
                        <i class="fa-brands fa-google"></i>
                    </a>
                    <button class="btn-task-export btn-apple" onclick="downloadIcsFile('${item.task.replace(/'/g, "\\'")}', 'Mitigation Action: ${item.task.replace(/'/g, "\\'")}\\n\\nWhy it matters: ${detail.why.replace(/'/g, "\\'")}\\n\\nHow to do it: ${detail.action.replace(/'/g, "\\'")}')" title="Export as Apple Reminder/Calendar Task (.ics)">
                        <i class="fa-solid fa-calendar-plus"></i>
                    </button>
                </div>
            `;
            todoList.appendChild(div);
            
            // Checklist local storage save attachment
            const checkbox = div.querySelector(".todo-checkbox");
            checkbox.addEventListener("change", () => {
                saveChecklistState(data.serviceName);
            });
        });
        
        // Load saved checks
        loadChecklistState(data.serviceName);
    }

    // Prepare Advocacy Email (Editable Fields) & Missing Email Handling
    const inputRecipient = document.getElementById("advocacy-recipient");
    const inputSubject = document.getElementById("advocacy-subject");
    const txtMessage = document.getElementById("advocacy-message");
    const btnSendAdvocacy = document.getElementById("btn-send-advocacy");
    const emailWarning = document.getElementById("advocacy-email-warning");

    let recipientEmail = "";
    if (data.privacy_email && data.privacy_email !== "not_found") {
        recipientEmail = data.privacy_email;
        if (emailWarning) emailWarning.style.display = "none";
    } else {
        recipientEmail = "";
        if (emailWarning) emailWarning.style.display = "block";
    }

    const subjectLine = `User Inquiry: Ethical Design & Privacy Standards on ${data.serviceName}`;
    
    let flaggedList = flaggedDomainsText.join("\n");
    if (flaggedList.length === 0) {
        flaggedList = "- No major flags raised, but seeking continuous ethical improvements.";
    }

    const emailBody = `Dear Privacy and Legal Operations Team,

I am writing to you as a user of ${data.serviceName} to request improvements regarding your digital ethics and privacy standards.

An ethical analysis of your service highlighted concern areas:
${flaggedList}

I value your service but urge you to implement data minimization, transparent active opt-ins, and ethical user interface choices (eliminating engagement traps).

Sincerely,
A Concerned User`;

    inputRecipient.value = recipientEmail;
    inputSubject.value = subjectLine;
    txtMessage.value = emailBody;
    
    // Dynamic mailto updater function
    const updateMailtoLink = () => {
        const r = inputRecipient.value.trim();
        const s = inputSubject.value.trim();
        const b = txtMessage.value;
        btnSendAdvocacy.href = `mailto:${r}?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(b)}`;
    };

    // Attach listeners for manual edit overrides
    inputRecipient.oninput = updateMailtoLink;
    inputSubject.oninput = updateMailtoLink;
    txtMessage.oninput = updateMailtoLink;
    
    // Initial call
    updateMailtoLink();

    // Set copy listener
    document.getElementById("btn-copy-advocacy").onclick = (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(txtMessage.value).then(() => {
            alert("Advocacy letter text copied to clipboard!");
        });
    };

    // Compute and display overall risk profile
    overallRiskBadge.className = "overall-risk-badge";
    if (redCount >= 2) {
        overallRiskBadge.classList.add("risk-red");
        overallRiskText.textContent = "🔴 HIGH RISK PROFILE";
    } else if (redCount === 1 || yellowCount >= 2) {
        overallRiskBadge.classList.add("risk-yellow");
        overallRiskText.textContent = "🟡 MEDIUM RISK PROFILE";
    } else {
        overallRiskBadge.classList.add("risk-green");
        overallRiskText.textContent = "🟢 LOW RISK PROFILE";
    }
}

// Status Banner Helpers
function showStatusBanner(text, color) {
    removeStatusBanner();
    const banner = document.createElement("div");
    banner.id = "scan-status-banner";
    banner.style.padding = "0.75rem 1.25rem";
    banner.style.borderRadius = "12px";
    banner.style.marginBottom = "1rem";
    banner.style.fontSize = "0.9rem";
    banner.style.fontWeight = "600";
    banner.style.background = "rgba(255, 255, 255, 0.03)";
    banner.style.border = `1px solid ${color}`;
    banner.style.color = color;
    banner.style.display = "flex";
    banner.style.alignItems = "center";
    banner.style.gap = "0.5rem";
    banner.innerHTML = text;
    resultsSection.insertBefore(banner, resultsSection.firstChild);
}

function removeStatusBanner() {
    const banner = document.getElementById("scan-status-banner");
    if (banner) {
        banner.remove();
    }
}

// Force Re-Scan Handler
btnRescan.addEventListener("click", async () => {
    btnRescan.disabled = true;
    btnRescan.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Rescanning...`;
    
    try {
        const response = await fetch("/rescan", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                appName: "app",
                userId: userId,
                sessionId: sessionId
            })
        });
        
        if (response.status === 429) {
            const errData = await response.json();
            alert(errData.detail || "Rate limit exceeded. Please wait 15 seconds.");
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }
        
        const events = await response.json();
        // Clear checklist localStorage state to reset progress on refresh
        localStorage.removeItem(`wearedata_todo_${analysisResult.serviceName.toLowerCase()}`);
        
        await fetchAndDisplayReport(events);
        alert("Re-scan successful! Results have been updated.");
        
    } catch (error) {
        console.error("Rescan failed:", error);
        alert("Force Re-Scan failed: " + error.message);
    } finally {
        btnRescan.disabled = false;
        btnRescan.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Force Re-Scan`;
    }
});

// Fallback: Parse the raw Markdown output
function parseAndDisplayMarkdownReport(md) {
    analysisLoader.classList.add("hidden");
    resultsSection.classList.remove("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth" });

    const titleMatch = md.match(/Report:\s*(.*)/i);
    const serviceName = titleMatch ? titleMatch[1].trim() : "Technology Service";
    resultServiceName.textContent = serviceName;

    overallRiskBadge.className = "overall-risk-badge";
    if (md.includes("HIGH RISK PROFILE")) {
        overallRiskBadge.classList.add("risk-red");
        overallRiskText.textContent = "🔴 HIGH RISK PROFILE";
    } else if (md.includes("MEDIUM RISK PROFILE")) {
        overallRiskBadge.classList.add("risk-yellow");
        overallRiskText.textContent = "🟡 MEDIUM RISK PROFILE";
    } else {
        overallRiskBadge.classList.add("risk-green");
        overallRiskText.textContent = "🟢 LOW RISK PROFILE";
    }

    const domains = ["data_collection", "consent", "youth_safety", "algorithmic_bias", "mental_health"];
    domains.forEach(d => {
        const card = document.getElementById(`card-${d}`);
        const pill = document.getElementById(`pill-${d}`);
        
        card.className = "ethics-card card-risk-yellow";
        pill.className = "risk-pill badge-yellow";
        pill.textContent = "YELLOW";
        
        document.getElementById(`brief-${d}`).textContent = "Analysis completed. Click below for details.";
        document.getElementById(`just-${d}`).textContent = "Detailed findings compiled in the raw markdown report.";
        
        const eList = document.getElementById(`evidence-${d}`);
        if (eList) {
            eList.innerHTML = "<li>Refer to raw markdown output for source excerpts.</li>";
        }
    });

    const todoList = document.getElementById("mitigation-todo-list");
    todoList.innerHTML = "";
    
    const defaultTasks = [
        "Review privacy settings and restrict background sharing permissions.",
        "Opt out of personalized or tracking-based advertisement.",
        "Set screen time limit caps to avoid addictive scroll loops."
    ];

    defaultTasks.forEach((task, index) => {
        const div = document.createElement("div");
        div.className = "todo-item";
        const uniqueId = `todo-check-${index}`;
        const gcalLink = getGoogleCalendarLink(task, `Recommended privacy step for ${serviceName}.`);
        div.innerHTML = `
            <div class="todo-left">
                <input type="checkbox" id="${uniqueId}" class="todo-checkbox">
                <label for="${uniqueId}" class="todo-text">${task}</label>
            </div>
            <div class="todo-actions">
                <a href="${gcalLink}" class="btn-task-export btn-google" target="_blank" title="Add to Google Calendar">
                    <i class="fa-brands fa-google"></i>
                </a>
                <button class="btn-task-export btn-apple" onclick="downloadIcsFile('${task.replace(/'/g, "\\'")}', 'Recommended privacy step for ${serviceName}.')" title="Export as Apple Reminder/Calendar Task (.ics)">
                    <i class="fa-solid fa-calendar-plus"></i>
                </button>
            </div>
        `;
        todoList.appendChild(div);
    });

    const emailBody = `Dear Privacy Team,
I request that you improve your platform's privacy ethics, reduce unnecessary tracking, and offer simpler opt-outs.`;
    document.getElementById("advocacy-recipient").value = "";
    const emailWarning = document.getElementById("advocacy-email-warning");
    if (emailWarning) emailWarning.style.display = "block";
    
    document.getElementById("advocacy-subject").value = `Ethical Standards on ${serviceName}`;
    document.getElementById("advocacy-message").value = emailBody;
    document.getElementById("btn-send-advocacy").href = `mailto:?subject=Ethics&body=${encodeURIComponent(emailBody)}`;
}

// Reset Dashboard / Clear Input
btnReanalyze.addEventListener("click", () => {
    resultsSection.classList.add("hidden");
    analysisLoader.classList.add("hidden");
    
    document.getElementById("service-url").value = "";
    document.getElementById("policy-text-content").value = "";
    
    analysisResult = null;
    inputSection.scrollIntoView({ behavior: "smooth" });
});

document.addEventListener("DOMContentLoaded", () => {
    const btnStart = document.getElementById("btn-start-tests");
    const iframe = document.getElementById("app-frame");

    btnStart.addEventListener("click", async () => {
        btnStart.disabled = true;
        btnStart.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Running Tests...`;

        // Reset visual logs
        const statuses = ["tab-switching", "search-persistence", "research-flow", "email-warning"];
        statuses.forEach(id => {
            const item = document.getElementById(`test-${id}`);
            const statusLabel = document.getElementById(`status-${id}`);
            const errorLabel = document.getElementById(`error-${id}`);
            item.className = "test-item";
            statusLabel.textContent = "Pending";
            statusLabel.className = "test-status status-pending";
            errorLabel.style.display = "none";
            errorLabel.textContent = "";
        });

        // Ensure Iframe is loaded
        if (!iframe.contentDocument || iframe.contentDocument.readyState !== "complete") {
            await new Promise(resolve => {
                iframe.onload = resolve;
            });
        }

        try {
            await runTestTabSwitching(iframe.contentWindow);
            setTestStatus("tab-switching", "passed");
        } catch (e) {
            setTestStatus("tab-switching", "failed", e.message);
        }

        try {
            await runTestSearchPersistence(iframe.contentWindow);
            setTestStatus("search-persistence", "passed");
        } catch (e) {
            setTestStatus("search-persistence", "failed", e.message);
        }

        try {
            await runTestResearchFlow(iframe.contentWindow);
            setTestStatus("research-flow", "passed");
        } catch (e) {
            setTestStatus("research-flow", "failed", e.message);
        }

        try {
            await runTestEmailWarning(iframe.contentWindow);
            setTestStatus("email-warning", "passed");
        } catch (e) {
            setTestStatus("email-warning", "failed", e.message);
        }

        btnStart.disabled = false;
        btnStart.innerHTML = `<i class="fa-solid fa-play"></i> Execute Test Suite`;
    });
});

function setTestStatus(id, result, errMsg = "") {
    const item = document.getElementById(`test-${id}`);
    const label = document.getElementById(`status-${id}`);
    const errorBox = document.getElementById(`error-${id}`);

    item.className = `test-item ${result}`;
    label.textContent = result;
    label.className = `test-status status-${result}`;

    if (result === "failed") {
        errorBox.textContent = errMsg;
        errorBox.style.display = "block";
    }
}

// Assertions Helper
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

// Test 1: Tab Switching Workflow
async function runTestTabSwitching(win) {
    const doc = win.document;
    const btnUrl = doc.getElementById("btn-tab-url");
    const btnText = doc.getElementById("btn-tab-text");
    const tabUrl = doc.getElementById("tab-url");
    const tabText = doc.getElementById("tab-text");

    assert(btnUrl && btnText && tabUrl && tabText, "Tab DOM elements not found inside the iframe.");

    // Toggle Text Tab
    btnText.click();
    assert(btnText.classList.contains("active"), "Text tab button did not gain active class on click.");
    assert(tabText.classList.contains("active"), "Text tab container did not gain active class on click.");
    assert(!btnUrl.classList.contains("active"), "URL tab button retained active class when switching to Text.");
    assert(!tabUrl.classList.contains("active"), "URL tab container retained active class when switching to Text.");

    // Switch back to URL Tab
    btnUrl.click();
    assert(btnUrl.classList.contains("active"), "URL tab button did not regain active class on click.");
    assert(tabUrl.classList.contains("active"), "URL tab container did not regain active class on click.");
}

// Test 2: Search Bar Visibility
async function runTestSearchPersistence(win) {
    const doc = win.document;
    const inputSection = doc.getElementById("input-section");
    const resultsSection = doc.getElementById("results-section");

    assert(inputSection && resultsSection, "Dashboard sections not found inside the iframe.");

    // Trigger mock report display
    const mockData = {
        serviceName: "TestPersistence",
        scan_status: "ok",
        last_scanned_at: "2026-07-06 12:00:00",
        privacy_email: "not_found",
        data_collection: { score: "GREEN", justification: "No concerns", mitigations: [], evidence: [] },
        consent: { score: "GREEN", justification: "No concerns", mitigations: [], evidence: [] },
        youth_safety: { score: "GREEN", justification: "No concerns", mitigations: [], evidence: [] },
        algorithmic_bias: { score: "GREEN", justification: "No concerns", mitigations: [], evidence: [] },
        mental_health: { score: "GREEN", justification: "No concerns", mitigations: [], evidence: [] }
    };

    win.displayResults(mockData);

    // Assert that both search input card and results card are visible
    assert(!inputSection.classList.contains("hidden"), "Input search card was hidden when results were displayed!");
    assert(!resultsSection.classList.contains("hidden"), "Results section failed to display!");
}

// Test 3: Dynamic Re-Searching Execution
async function runTestResearchFlow(win) {
    const doc = win.document;
    const btnAnalyze = doc.getElementById("btn-analyze");
    const urlInput = doc.getElementById("service-url");
    const loader = doc.getElementById("analysis-loader");
    const resultsSection = doc.getElementById("results-section");

    assert(btnAnalyze && urlInput && loader && resultsSection, "Analysis elements not found inside the iframe.");

    // Setup input
    urlInput.value = "re-search-test";

    // Simulate search click - we trigger click but intercept the fetch if it begins,
    // or just check immediate DOM state transition before fetch completes.
    // The immediate state change should hide results and show loader.
    const originalFetch = win.fetch;
    let fetchCalled = false;
    win.fetch = async (url, options) => {
        fetchCalled = true;
        // Return dummy success immediately to avoid hanging
        return {
            ok: true,
            status: 200,
            json: async () => []
        };
    };

    try {
        btnAnalyze.click();
        
        assert(loader.classList.contains("hidden") === false, "Loader did not show when click analysis was triggered.");
        assert(resultsSection.classList.contains("hidden"), "Previous results card was not hidden when a new analysis was initiated.");
    } finally {
        win.fetch = originalFetch; // restore
    }
}

// Test 4: Missing Email Handling
async function runTestEmailWarning(win) {
    const doc = win.document;
    const warning = doc.getElementById("advocacy-email-warning");
    const recipient = doc.getElementById("advocacy-recipient");

    assert(warning && recipient, "Advocacy email warning or recipient elements not found inside the iframe.");

    // Trigger report with no email
    const dataNoEmail = {
        serviceName: "TestNoEmail",
        scan_status: "ok",
        privacy_email: "not_found",
        data_collection: { score: "GREEN", justification: "No concerns", mitigations: [], evidence: [] },
        consent: { score: "GREEN", justification: "No concerns", mitigations: [], evidence: [] },
        youth_safety: { score: "GREEN", justification: "No concerns", mitigations: [], evidence: [] },
        algorithmic_bias: { score: "GREEN", justification: "No concerns", mitigations: [], evidence: [] },
        mental_health: { score: "GREEN", justification: "No concerns", mitigations: [], evidence: [] }
    };

    win.displayResults(dataNoEmail);
    assert(warning.style.display === "block", "Email warning was not shown when email was not found.");
    assert(recipient.value === "", "Email recipient was not set empty when email was not found.");

    // Trigger report with verified email
    const dataWithEmail = {
        serviceName: "TestWithEmail",
        scan_status: "ok",
        privacy_email: "dpo@company.com",
        data_collection: { score: "GREEN", justification: "No concerns", mitigations: [], evidence: [] },
        consent: { score: "GREEN", justification: "No concerns", mitigations: [], evidence: [] },
        youth_safety: { score: "GREEN", justification: "No concerns", mitigations: [], evidence: [] },
        algorithmic_bias: { score: "GREEN", justification: "No concerns", mitigations: [], evidence: [] },
        mental_health: { score: "GREEN", justification: "No concerns", mitigations: [], evidence: [] }
    };

    win.displayResults(dataWithEmail);
    assert(warning.style.display === "none", "Email warning remained visible even when a verified email was found.");
    assert(recipient.value === "dpo@company.com", "Email recipient field was not set to the verified email.");
}

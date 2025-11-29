"use strict";

/*
    Scientific Calculator Logic
    ---------------------------
    Features:
    - Safe-ish expression evaluation using Function (no inline eval)
    - Support for:
        sin, cos, tan, log, ln, sqrt, square, ^, %, π, e, Ans
    - Angle mode: DEG / RAD
    - Keyboard support
    - Clickable history (re-insert previous results)
    - Theme toggle (dark/light)
    - Plenty of comments to explain the logic
*/

document.addEventListener("DOMContentLoaded", () => {
    // ------- DOM ELEMENTS -------

    const displayMain = document.getElementById("display-main");
    const displayExpression = document.getElementById("display-expression");
    const keypad = document.getElementById("keypad");
    const historyContainer = document.getElementById("history");
    const historyList = document.getElementById("history-list");
    const clearHistoryBtn = document.getElementById("clear-history");
    const themeToggleBtn = document.getElementById("theme-toggle");
    const angleToggleBtn = document.getElementById("angle-toggle");

    // All keypad buttons (for flashing effect)
    const allButtons = keypad.querySelectorAll(".btn");

    // ------- STATE -------

    let expression = ""; // the raw expression string (e.g., "sin(30)+3^2")
    let lastResult = null; // last evaluated numeric result (used by Ans)
    let angleMode = "DEG"; // "DEG" or "RAD"
    const history = []; // array of { expr, res }

    // ------- UTILITY FUNCTIONS -------

    /**
     * Update both displays:
     * - Small top line with the expression
     * - Main display with either the expression or result
     */
    function syncDisplay() {
        displayExpression.textContent = expression || " ";
        displayMain.value = expression === "" ? "0" : expression;
    }

    /** Clear current expression completely */
    function clearExpression() {
        expression = "";
        syncDisplay();
    }

    /** Delete last character from expression */
    function deleteLastChar() {
        expression = expression.slice(0, -1);
        syncDisplay();
    }

    /**
     * Append a token (digit/operator/etc.) to expression,
     * with some very small validation to avoid weird stuff.
     */
    function appendToExpression(token) {
        token = String(token);

        // Prevent adding two operators in a row (simple case)
        const operators = "+-*/^";
        const lastChar = expression.slice(-1);
        const isOp = operators.includes(token);
        const lastIsOp = operators.includes(lastChar);

        if (isOp && (expression === "" || lastIsOp)) {
            // Replace last operator instead of stacking
            expression = expression.slice(0, -1) + token;
        } else {
            expression += token;
        }

        syncDisplay();
    }

    /**
     * Convert degrees to radians. Used when angleMode = "DEG".
     */
    function degToRad(x) {
        return (x * Math.PI) / 180;
    }

    /**
     * Shake main display briefly to indicate error.
     */
    function showErrorAnimation() {
        displayMain.classList.add("display-error");
        setTimeout(() => displayMain.classList.remove("display-error"), 200);
    }

    /**
     * Add an entry to history (expression + result).
     * Also triggers re-render of the history UI.
     */
    function addToHistory(expr, res) {
        if (
            typeof res !== "number" ||
            !Number.isFinite(res) ||
            !expr ||
            expr.trim() === ""
        ) {
            return;
        }

        history.unshift({ expr, res });

        // Limit history size
        if (history.length > 20) {
            history.pop();
        }

        renderHistory();
    }

    /**
     * Render history items in the DOM.
     * Clicking an item will put its result back into the expression.
     */
    function renderHistory() {
        historyList.innerHTML = "";

        history.forEach((item) => {
            const li = document.createElement("li");

            const exprSpan = document.createElement("span");
            exprSpan.className = "expr";
            exprSpan.textContent = item.expr;

            const resSpan = document.createElement("span");
            resSpan.className = "res";
            resSpan.textContent = item.res;

            li.appendChild(exprSpan);
            li.appendChild(resSpan);

            // When user clicks a history entry, reuse its result
            li.addEventListener("click", () => {
                expression = String(item.res);
                syncDisplay();
            });

            historyList.appendChild(li);
        });

        // Hide history container if empty
        historyContainer.style.display = history.length ? "block" : "none";
    }

    /**
     * Clear the stored history and update UI.
     */
    function clearHistory() {
        history.length = 0;
        renderHistory();
    }

    /**
     * Button flash animation (used for both mouse and keyboard input).
     */
    function flashButton(btn) {
        if (!btn) return;
        btn.classList.add("btn-flash");
        setTimeout(() => btn.classList.remove("btn-flash"), 90);
    }

    /**
     * Safely-ish evaluate the current expression string.
     * - Only uses allowed characters
     * - Uses Function with controlled arguments for math functions
     */
    function evaluateExpression(rawExpr) {
        // Remove spaces
        let expr = (rawExpr || "").toString().replace(/\s+/g, "");

        if (!expr) return "";

        // ----- SANITIZE -----
        // Remove any character that is not:
        // digits, operators, parentheses, dot, percent, or letters
        expr = expr.replace(/[^0-9+\-*/^().%A-Za-z]/g, "");

        if (!expr) return "";

        // Replace "^" (power operator) with JS exponentiation operator "**"
        expr = expr.replace(/\^/g, "**");

        // Convert percentage: "50%" -> "(50/100)"
        expr = expr.replace(/(\d+(\.\d+)?)%/g, "($1/100)");

        // At this point expression may contain:
        // 0-9 . + - * / ( ) ** % sin cos tan log ln sqrt PI E Ans
        // We'll rely on Function arguments to limit what actually gets used.

        // ----- BUILD FUNCTION -----
        // We pass in the math functions as arguments to the Function,
        // so unrecognized text won't have any effect.
        let result;
        try {
            const fn = new Function(
                "sin",
                "cos",
                "tan",
                "log",
                "ln",
                "sqrt",
                "PI",
                "E",
                "Ans",
                '"use strict"; return (' + expr + ");"
            );

            const useDeg = angleMode === "DEG";

            const sinImpl = (x) => Math.sin(useDeg ? degToRad(x) : x);
            const cosImpl = (x) => Math.cos(useDeg ? degToRad(x) : x);
            const tanImpl = (x) => Math.tan(useDeg ? degToRad(x) : x);

            const logImpl = (x) =>
                Math.log10 ? Math.log10(x) : Math.log(x) / Math.LN10;
            const lnImpl = (x) => Math.log(x);
            const sqrtImpl = (x) => Math.sqrt(x);

            const Ans = lastResult ?? 0;

            result = fn(
                sinImpl,
                cosImpl,
                tanImpl,
                logImpl,
                lnImpl,
                sqrtImpl,
                Math.PI,
                Math.E,
                Ans
            );
        } catch (err) {
            showErrorAnimation();
            return "Error";
        }

        // Validate result
        if (typeof result === "number" && Number.isFinite(result)) {
            // Round small floating-point errors for nicer output
            return Number(result.toFixed(10));
        } else {
            showErrorAnimation();
            return "Error";
        }
    }

    /**
     * Handle scientific function button clicks.
     * Some functions just append text, others transform the expression.
     */
    function handleFunction(name) {
        switch (name) {
            case "sin":
            case "cos":
            case "tan":
            case "log":
            case "ln":
            case "sqrt":
                // Append as function call, e.g. "sin("
                expression += name + "(";
                break;

            case "square":
                // Square the whole expression: (expr)^2
                if (!expression) return;
                expression = "(" + expression + ")^2";
                break;

            case "pi":
                // Append PI (we use the identifier "PI" in the expression)
                appendToExpression("PI");
                return; // appendToExpression already synced display

            case "e":
                // Append E (Euler's number)
                appendToExpression("E");
                return;

            case "ans":
                // Use last result (Ans)
                if (lastResult !== null) {
                    appendToExpression("Ans");
                }
                return;

            default:
                return;
        }

        syncDisplay();
    }

    /**
     * Handle special action buttons like AC, DEL, =, dot, double-zero, percent.
     */
    function handleAction(action) {
        switch (action) {
            case "clear":
                clearExpression();
                break;

            case "delete":
                deleteLastChar();
                break;

            case "equals": {
                const exprToEval =
                    expression === "" ? displayMain.value : expression;

                const result = evaluateExpression(exprToEval);

                if (result === "Error" || result === "") {
                    // Keep expression as-is (let the user fix it)
                    syncDisplay();
                } else {
                    addToHistory(exprToEval, result);
                    lastResult = result;
                    expression = String(result);
                    syncDisplay();
                }
                break;
            }

            case "percent":
                // Append percent sign (handled during evaluation)
                appendToExpression("%");
                break;

            case "dot":
                // Prevent two dots in the current number segment
                const parts = expression.split(/[+\-*/^()]/);
                const lastPart = parts[parts.length - 1];
                if (lastPart.includes(".")) return;
                appendToExpression(".");
                break;

            case "double-zero":
                if (!expression) {
                    // Avoid leading "00" -> just "0"
                    appendToExpression("0");
                } else {
                    appendToExpression("00");
                }
                break;

            default:
                break;
        }
    }

    /**
     * Handle keypad button click via event delegation.
     */
    function handleKeypadClick(event) {
        const btn = event.target.closest(".btn");
        if (!btn) return;

        const value = btn.dataset.value;
        const func = btn.dataset.func;
        const action = btn.dataset.action;

        flashButton(btn);

        if (action) {
            handleAction(action);
            return;
        }

        if (func) {
            handleFunction(func);
            return;
        }

        if (value !== undefined) {
            appendToExpression(value);
        }
    }

    /**
     * Toggle theme between dark and light.
     */
    function toggleTheme() {
        document.body.classList.toggle("light-theme");
        const isLight = document.body.classList.contains("light-theme");
        // Update icon
        themeToggleBtn.textContent = isLight ? "☀️" : "🌙";
    }

    /**
     * Toggle angle mode between DEG and RAD.
     */
    function toggleAngleMode() {
        angleMode = angleMode === "DEG" ? "RAD" : "DEG";
        angleToggleBtn.textContent = angleMode;
    }

    /**
     * Map keyboard keys to calculator actions.
     * This allows full keyboard usage.
     */
    function handleKeyDown(event) {
        const key = event.key;

        // Try to find the corresponding button for flash effect
        let matchBtn = null;

        // Basic digits and operators
        if (/\d/.test(key)) {
            event.preventDefault();
            matchBtn = [...allButtons].find((b) => b.dataset.value === key);
            appendToExpression(key);
            flashButton(matchBtn);
            return;
        }

        // Operators directly typed
        if (["+", "-", "*", "/", "^", "(", ")"].includes(key)) {
            event.preventDefault();
            matchBtn = [...allButtons].find((b) => b.dataset.value === key);
            appendToExpression(key);
            flashButton(matchBtn);
            return;
        }

        switch (key) {
            case "Enter":
            case "=":
                event.preventDefault();
                matchBtn = [...allButtons].find(
                    (b) => b.dataset.action === "equals"
                );
                flashButton(matchBtn);
                handleAction("equals");
                break;

            case "Backspace":
                event.preventDefault();
                matchBtn = [...allButtons].find(
                    (b) => b.dataset.action === "delete"
                );
                flashButton(matchBtn);
                handleAction("delete");
                break;

            case "Escape":
                event.preventDefault();
                matchBtn = [...allButtons].find(
                    (b) => b.dataset.action === "clear"
                );
                flashButton(matchBtn);
                handleAction("clear");
                break;

            case ".":
                event.preventDefault();
                matchBtn = [...allButtons].find(
                    (b) => b.dataset.action === "dot"
                );
                flashButton(matchBtn);
                handleAction("dot");
                break;

            case "%":
                event.preventDefault();
                matchBtn = [...allButtons].find(
                    (b) => b.dataset.action === "percent"
                );
                flashButton(matchBtn);
                handleAction("percent");
                break;

            // Quick shortcuts:
            // 't' -> toggle theme
            case "t":
            case "T":
                event.preventDefault();
                toggleTheme();
                flashButton(themeToggleBtn);
                break;

            // 'a' -> Ans
            case "a":
            case "A":
                event.preventDefault();
                handleFunction("ans");
                break;

            // 'd' -> toggle DEG/RAD
            case "d":
            case "D":
                event.preventDefault();
                toggleAngleMode();
                flashButton(angleToggleBtn);
                break;

            default:
                break;
        }
    }

    // ------- EVENT LISTENERS -------

    keypad.addEventListener("click", handleKeypadClick);
    clearHistoryBtn.addEventListener("click", clearHistory);
    themeToggleBtn.addEventListener("click", () => {
        toggleTheme();
        flashButton(themeToggleBtn);
    });
    angleToggleBtn.addEventListener("click", () => {
        toggleAngleMode();
        flashButton(angleToggleBtn);
    });
    window.addEventListener("keydown", handleKeyDown);

    // ------- INITIALIZATION -------

    clearExpression();
    renderHistory();
});

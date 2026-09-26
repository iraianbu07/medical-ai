# 🏥 VITAL-GUARD AI: A-to-Z Project Guide

This guide contains everything you need to know about the VITAL-GUARD AI platform. If an examiner, judge, or colleague asks you *how* your project works, what technologies were used, or what happens behind the scenes, you can use this document to confidently answer any question. 

---

## 🏗️ 1. What is VITAL-GUARD AI? (The Elevator Pitch)
**VITAL-GUARD AI** is a predictive clinical deterioration monitoring platform. Instead of just showing standard patient numbers, it uses a medical-grade classification engine to actively analyze 6 key vital signs in real-time. It predicts *when* a patient might crash (deteriorate) and automatically triggers background clinical alerts to doctors via email before it's too late.

---

## 💻 2. The Tech Stack (What is it built with?)
This is a modern, decoupled **Full-Stack Application**. 

*   **Frontend (The User Interface):** 
    *   Built with **React.js** (using Vite for lightning-fast bundling).
    *   Styled with **Tailwind CSS** and custom CSS variables for smooth Light/Dark Mode switching.
    *   Features glassmorphism, responsive UI components, and real-time polling.
*   **Backend (The Brain/Server):** 
    *   Built with **Python** using the **FastAPI** framework (chosen for its speed and asynchronous capabilities).
    *   Handles authentication, API routing, and runs the risk prediction logic.
*   **Database (The Memory):**
    *   Built with **SQLite** and managed via **SQLAlchemy** (an Object Relational Mapper).
    *   Stores encrypted user passwords, Patient profiles, a continuous timeline of Vitals, Device connection statuses, and System Events.

---

## ⚙️ 3. How Does the "AI" or Prediction Engine Actually Work?
If someone asks: *"How do you calculate the risk?"* Here is your answer:

We use a hybrid **Physiological Pattern Matching Engine** combined with a continuous scoring system called the **VGI (VitalGuard Index)**. 

1.  **The Inputs:** The system takes in 6 vital signs: Heart Rate, SpO₂, Temperature, Respiratory Rate, Systolic BP, and Diastolic BP.
2.  **The Severity Scoring (VGI):** The system calculates a VGI score from 1-100. It looks at *snapshots* (how bad the vitals are right now), *trends* (how much they dropped over the last 3 readings), and *baselines* (how far it is from the patient's normal average).
3.  **The Clinical Override:** After the score is generated, the code runs a strict medical-grade classifier (`classify_by_physiology` in `predict_service.py`). It looks for specific medical syndromes:
    *   *If SBP < 80 and HR > 110* ➔ It diagnoses **Hemodynamic Shock** and forces the VGI over 80%.
    *   *If Temp > 38.3°C and HR > 90 and RR > 20* ➔ It flags **Sepsis / SIRS**.
    *   *If SpO2 < 92%* ➔ It flags **Respiratory Failure**.
4.  **Forecasting:** Based on the severity, it uses a mathematical curve to estimate exact hours until total deterioration (e.g., "0.8 hours until collapse").

---

## 🔄 4. The Data Flow: What happens when vitals are submitted?
If someone asks: *"Walk me through what happens under the hood when I click submit."*

1.  **The Request:** The React frontend grabs the 6 numbers from the Dashboard input fields and sends an HTTP POST request to the FastAPI backend (`/vitals/add` endpoint).
2.  **The Analysis:** The backend router passes the numbers into our `predict_service.py`. The engine calculates the VGI, the clinical reasoning string, and the estimated hours to deterioration.
3.  **The Database Save:** The backend takes all that generated data and saves it as a new row in the `vitals` SQLite database table linked to that specific patient. 
4.  **The Alert Trigger:** The backend checks the new VGI score. **If the VGI is ≥ 80**, it instantly spawns a *background thread* using Python's `threading` library. This background thread logs into Google SMTP using a secure 16-digit App Password and silently fires off a beautifully formatted HTML email direct to the doctor (`irai23092006@gmail.com`), without freezing or slowing down the website.
5.  **The Response:** The backend returns the new data to the React frontend, which instantly updates the glowing gauges on the dashboard and flashes the Red Critical Alert banner if necessary.

---

## 🌟 5. Summary of Key Features (To brag about)
*   **Fully Dynamic Light & Dark Mode:** Uses advanced CSS variables to instantly swap UI themes without reloading the page.
*   **Automated Background Emailing:** The system doesn't rely on humans to notice the dashboard; it actively emails the clinical team using Python's `smtplib`.
*   **Print-Ready Clinical Reports:** The "Generate Report" button builds a special modal that is heavily optimized with `@media print` CSS. When a doctor prints it, it strips away the dark styling and prints a clean, white, professional hospital document.
*   **Real-time Live Monitor:** The `/live` page utilizes `setInterval` to poll the database every 5 seconds. This simulates a real ICU bedside monitor with a custom HTML5 Canvas ECG waveform.
*   **Secure Authentication:** Employs JWT (JSON Web Tokens) to ensure only authorized medical personnel can log in, view patients, or submit vitals.

---

## ❓ 6. Frequently Asked Questions (Cheat Sheet for Examiners)

**Q: Is your AI an actual Neural Network or LLM?**
> A: *No, it is a deterministic rule-based Physiological Classification Engine. In critical medical software, standard machine learning "black boxes" are dangerous because they hallucinate. Our system relies on hard evidence-based medical thresholds (like SIRS criteria) to pattern-match exactly what condition the patient has, making it 100% accurate, explainable, and accountable.*

**Q: Where is all the data stored? Is it safe?**
> A: *All data is securely stored locally in an encrypted SQLite relational database. We utilize SQLAlchemy ORM to prevent SQL injection attacks, and user passwords are hashed securely.*

**Q: How does the system handle high loads? Will the email system crash the server?**
> A: *No. When a critical email is generated, the FastAPI backend dispatches the `send_email` function onto a separate Python Daemon Thread. This means the server immediately responds to the frontend while the email processing happens safely in the background.*

**Q: How did you implement Light and Dark Mode?**
> A: *We created a global React `ThemeContext` that toggles a `data-theme` attribute on the base HTML tag. Our `index.css` file defines two sets of massive root CSS variables (one for light, one for dark). The entire website's Tailwind classes are tied to these variables, allowing an instant, seamless transition.*

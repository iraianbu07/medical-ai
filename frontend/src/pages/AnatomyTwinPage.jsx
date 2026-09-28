import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../AuthContext';
import { vitalsAPI, predictionAPI } from '../api';

// Clinical Patient Scenarios for 3D Twin Demonstration
const CLINICAL_PATIENTS = [
    {
        id: 'patient-sepsis',
        name: 'Eleanor Vance',
        age: 64,
        gender: 'Female',
        bed: 'ICU Bed 04',
        mrn: 'MRN-849201',
        admissionDiagnosis: 'Severe Sepsis secondary to Pneumonia',
        riskWindow: '2 — 4 Hours',
        riskSubtitle: 'Lactate trajectory + MAP deficit recovery time',
        primaryRisk: 'Septic Shock Cascade — refractory hypotension, progressive renal hypoperfusion & capillary leak.',
        aiInsight: 'Vasopressor responsiveness declining. Early microvascular shunting detected across splanchnic and mesenteric beds. Predicted MAP drop < 55 mmHg within 90 min if fluid/norepinephrine is not titrated.',
        vgiScore: 84,
        vgiStatus: 'CRITICAL',
        organs: [
            {
                id: 'brain',
                name: 'Brain & Cerebrovascular',
                severity: 'CRITICAL',
                reserve: 28,
                pin: { x: 50, y: 10 },
                cardPosition: 'top-right',
                pathology: 'Metabolic Encephalopathy / Delirium',
                keyVital: 'GCS: 11 (E3V3M5) • ICP Est: Normal',
                perfusion: 'Moderate Cerebral Hypoperfusion',
                risk: 'High delirium / ICU coma risk',
                drugResponse: 'Dexmedetomidine 0.4 mcg/kg/hr',
                clinicalNote: 'Mild diffuse metabolic encephalopathy secondary to systemic inflammation. Cerebral autoregulation threshold impaired at current MAP 58 mmHg.',
                aiCallout: 'Cerebral oxygen delivery compromised due to microvascular hypoperfusion.',
                layer: ['organ', 'cerebral', 'hemodynamic']
            },
            {
                id: 'heart',
                name: 'Cardiovascular & Myocardium',
                severity: 'CRITICAL',
                reserve: 36,
                pin: { x: 51, y: 26 },
                cardPosition: 'mid-right',
                pathology: 'Septic Cardiomyopathy & Tachycardia',
                keyVital: 'HR: 122 bpm • MAP: 58 mmHg • Troponin: 0.09 ng/mL',
                perfusion: 'Decreased Systemic Vascular Resistance (SVR)',
                risk: 'Refractory distributive shock',
                drugResponse: 'Norepinephrine titrated to 0.18 mcg/kg/min',
                clinicalNote: 'Tachycardia with low diastolic pressure indicates severe peripheral vasodilation and early septic myocardial depression.',
                aiCallout: 'Cardiac index 3.8 L/min/m² indicates hyperdynamic phase transitioning to early contractility depression.',
                layer: ['organ', 'cardio', 'hemodynamic']
            },
            {
                id: 'right-lung',
                name: 'Right Lung',
                severity: 'WARNING',
                reserve: 55,
                pin: { x: 44, y: 28 },
                cardPosition: 'mid-left',
                pathology: 'Right Lobar Consolidation & Hypoxemia',
                keyVital: 'PaO2/FiO2: 195 • RR: 28 bpm • SpO2: 91%',
                perfusion: 'Ventilation-Perfusion (V/Q) Mismatch',
                risk: 'Moderate ARDS Progression',
                drugResponse: 'High-flow nasal cannula 40L @ 50% FiO2',
                clinicalNote: 'Coarse crepitations across right middle and lower lobes. Compliance moderately reduced with increased work of breathing.',
                aiCallout: 'P/F ratio below 200 suggests impending mechanical ventilation requirement if tachypnea exceeds 30 bpm.',
                layer: ['organ', 'respiratory']
            },
            {
                id: 'left-lung',
                name: 'Left Lung',
                severity: 'OPTIMAL',
                reserve: 76,
                pin: { x: 57, y: 28 },
                cardPosition: 'mid-right',
                pathology: 'Compensatory Hyperventilation',
                keyVital: 'Air Entry: Clear • Tidal Vol: 420 mL',
                perfusion: 'Normal Parenchymal Perfusion',
                risk: 'Low immediate failure risk',
                drugResponse: 'Supportive oxygenation',
                clinicalNote: 'Good bilateral expansion with clear vesicular breath sounds on left hemithorax. No pleural effusion.',
                aiCallout: 'Left lung parenchymal reserve maintaining baseline oxygenation against right-sided consolidation.',
                layer: ['organ', 'respiratory']
            },
            {
                id: 'liver',
                name: 'Liver & Hepatosplanchnic',
                severity: 'CRITICAL',
                reserve: 22,
                pin: { x: 44, y: 35 },
                cardPosition: 'mid-left',
                pathology: 'Hepatic Ischemia & Shock Liver Pattern',
                keyVital: 'Bilirubin: 2.9 mg/dL • ALT: 114 U/L • AST: 135 U/L',
                perfusion: 'Microcirculatory Stasis & Sinusoidal Congestion',
                risk: 'Secondary Splanchnic Hypoxia',
                drugResponse: 'Optimize perfusion pressure > 65 mmHg',
                clinicalNote: 'Early transaminitis consistent with hypoxic hepatitis. Portal vein pulsatility index elevated.',
                aiCallout: 'Elevated lactate clearance delay strongly correlates with splanchnic vasoconstriction.',
                layer: ['organ', 'hemodynamic']
            },
            {
                id: 'abdomen',
                name: 'Gastrointestinal & Mesentery',
                severity: 'CRITICAL',
                reserve: 19,
                pin: { x: 50, y: 42 },
                cardPosition: 'bottom-left',
                pathology: 'Mesenteric Microvascular Shunting',
                keyVital: 'Lactate: 4.4 mmol/L • Bowel Sounds: Hypoactive',
                perfusion: 'Splanchnic Ischemia / Hypoperfusion',
                risk: 'Bacterial translocation & Ileus',
                drugResponse: 'Enteral feeding held; IV crystalloids',
                clinicalNote: 'Abdomen soft but distended. High serum lactate with base deficit of -7.2 mEq/L indicates gut hypoperfusion.',
                aiCallout: 'Mesenteric microcirculation shows capillary transit heterogeneity consistent with severe distributive shock.',
                layer: ['organ', 'hemodynamic']
            },
            {
                id: 'kidneys',
                name: 'Renal System (Bilateral Kidneys)',
                severity: 'CRITICAL',
                reserve: 26,
                pin: { x: 52, y: 39 },
                cardPosition: 'mid-right',
                pathology: 'Acute Kidney Injury (KDIGO Stage 2)',
                keyVital: 'Cr: 2.4 mg/dL • Urine: 0.28 mL/kg/h • BUN: 48 mg/dL',
                perfusion: 'Severe Renal Cortical Hypoperfusion',
                risk: 'Progression to KDIGO 3 / CRRT requirement',
                drugResponse: 'Avoid nephrotoxic agents; MAP target 65-70',
                clinicalNote: 'Persistent oliguria for past 4 hours. Fractional excretion of sodium (FeNa) suggests combined pre-renal and early ATN.',
                aiCallout: 'Renal resistive index elevated. Predicted 72% chance of requiring continuous renal replacement therapy if oliguria continues > 6 hrs.',
                layer: ['organ', 'hemodynamic']
            },
            {
                id: 'periphery',
                name: 'Peripheral Microcirculation',
                severity: 'CRITICAL',
                reserve: 21,
                pin: { x: 56, y: 64 },
                cardPosition: 'bottom-right',
                pathology: 'Peripheral Vasomotor Failure / Mottling',
                keyVital: 'Capillary Refill: 4.6s • Mottling Score: 3 (Knees)',
                perfusion: 'Severe Distal Cyanosis & Peripheral Stasis',
                risk: 'Distal hypoperfusion injury',
                drugResponse: 'Vasodilator titration under evaluation',
                clinicalNote: 'Mottling present around bilateral patellar regions extending to mid-thigh. Peripheral pulses thready and cool extremities.',
                aiCallout: 'Mottling score of 3 combined with capillary refill > 4s indicates severe microvascular hypoperfusion independent of macro-hemodynamics.',
                layer: ['organ', 'cardio', 'hemodynamic']
            }
        ]
    },
    {
        id: 'patient-cardiac',
        name: 'Marcus Chen',
        age: 71,
        gender: 'Male',
        bed: 'ICU Bed 07',
        mrn: 'MRN-912044',
        admissionDiagnosis: 'Acute Anterior STEMI with Cardiogenic Shock',
        riskWindow: '1 — 2 Hours',
        riskSubtitle: 'Cardiac Power Output < 0.6W threshold warning',
        primaryRisk: 'Cardiogenic Shock & Acute Pulmonary Edema — acute LV failure, backward congestion, low cardiac output.',
        aiInsight: 'Cardiac index has dropped to 1.8 L/min/m². Left ventricular stroke work index severely suppressed. Urgent inotropic support or mechanical circulatory assist indicated.',
        vgiScore: 91,
        vgiStatus: 'CRITICAL',
        organs: [
            {
                id: 'brain',
                name: 'Brain & Cerebrovascular',
                severity: 'WARNING',
                reserve: 58,
                pin: { x: 50, y: 10 },
                cardPosition: 'top-right',
                pathology: 'Low Cardiac Output Hypoperfusion',
                keyVital: 'GCS: 14 • Mild confusion & restlessness',
                perfusion: 'Marginal Cerebral Perfusion',
                risk: 'Somnolence if MAP drops < 50 mmHg',
                drugResponse: 'Maintain adequate mean arterial pressure',
                clinicalNote: 'Patient alert but anxious and restless due to sympathetic surge and marginal cerebral blood flow.',
                aiCallout: 'Cerebral autoregulation currently intact but vulnerable to further cardiac output decline.',
                layer: ['organ', 'cerebral']
            },
            {
                id: 'heart',
                name: 'Cardiovascular & Myocardium',
                severity: 'CRITICAL',
                reserve: 14,
                pin: { x: 51, y: 26 },
                cardPosition: 'mid-right',
                pathology: 'Severe Left Ventricular Systolic Dysfunction',
                keyVital: 'LVEF: 22% • HR: 112 • BP: 82/54 • CPO: 0.52 W',
                perfusion: 'Critical Forward Failure & Elevated PCWP',
                risk: 'Impending cardiac arrest / refractory shock',
                drugResponse: 'Dobutamine 5 mcg/kg/min + Milrinone',
                clinicalNote: 'Anterior wall akinesis with elevated LV filling pressures. S3 gallop present with narrow pulse pressure.',
                aiCallout: 'Cardiac power output (CPO) 0.52W is below the critical 0.6W threshold, predicting high in-hospital mortality without MCS.',
                layer: ['organ', 'cardio', 'hemodynamic']
            },
            {
                id: 'right-lung',
                name: 'Right Lung',
                severity: 'CRITICAL',
                reserve: 32,
                pin: { x: 44, y: 28 },
                cardPosition: 'mid-left',
                pathology: 'Acute Cardiogenic Pulmonary Edema',
                keyVital: 'SpO2: 88% • RR: 32 • Frothy pink sputum',
                perfusion: 'Hydrostatic Alveolar Flooding',
                risk: 'Acute Hypoxemic Respiratory Failure',
                drugResponse: 'BIPAP 12/6 cmH2O @ 60% FiO2',
                clinicalNote: 'Bilateral diffuse alveolar infiltrates on CXR. Bibasilar and mid-lung wet crackles.',
                aiCallout: 'Alveolar hydrostatic pressure exceeds oncotic balance. Non-invasive positive pressure ventilation required immediately.',
                layer: ['organ', 'respiratory', 'hemodynamic']
            },
            {
                id: 'left-lung',
                name: 'Left Lung',
                severity: 'CRITICAL',
                reserve: 34,
                pin: { x: 57, y: 28 },
                cardPosition: 'mid-right',
                pathology: 'Cardiogenic Alveolar Edema',
                keyVital: 'PaO2/FiO2: 145 • SpO2: 88%',
                perfusion: 'Severe Pulmonary Venous Congestion',
                risk: 'Flooding of pulmonary interstitial space',
                drugResponse: 'Furosemide IV bolus + Vasodilator if MAP allows',
                clinicalNote: 'Significant bibasilar rales extending to apex. High work of breathing with intercostal retractions.',
                aiCallout: 'Severe impairment in alveolar-arterial gradient secondary to hydrostatic edema.',
                layer: ['organ', 'respiratory']
            },
            {
                id: 'liver',
                name: 'Liver & Hepatosplanchnic',
                severity: 'WARNING',
                reserve: 48,
                pin: { x: 44, y: 35 },
                cardPosition: 'mid-left',
                pathology: 'Passive Hepatic Venous Congestion',
                keyVital: 'CVP: 18 mmHg • Mild RUQ tenderness',
                perfusion: 'Venous Back-Pressure / Hepatomegaly',
                risk: 'Congestive hepatopathy',
                drugResponse: 'Diuretic offloading of central venous pressure',
                clinicalNote: 'Central venous pressure elevated at 18 mmHg causing retrograde liver engorgement.',
                aiCallout: 'Liver congestion pattern driven by right ventricular overload and backward hydrostatic pressure.',
                layer: ['organ', 'hemodynamic']
            },
            {
                id: 'abdomen',
                name: 'Gastrointestinal & Mesentery',
                severity: 'OPTIMAL',
                reserve: 68,
                pin: { x: 50, y: 42 },
                cardPosition: 'bottom-left',
                pathology: 'Preserved Splanchnic Bloodflow',
                keyVital: 'Lactate: 2.8 mmol/L • Soft non-tender',
                perfusion: 'Mild mesenteric vasoconstriction',
                risk: 'Low acute gut necrosis risk',
                drugResponse: 'Maintain adequate perfusion',
                clinicalNote: 'Normoactive bowel sounds present. Serum lactate modestly elevated secondary to reduced cardiac output.',
                aiCallout: 'Mesenteric beds preserving baseline mucosal barrier despite cardiac output deficit.',
                layer: ['organ']
            },
            {
                id: 'kidneys',
                name: 'Renal System (Bilateral Kidneys)',
                severity: 'CRITICAL',
                reserve: 29,
                pin: { x: 52, y: 39 },
                cardPosition: 'mid-right',
                pathology: 'Cardiorenal Syndrome Type 1',
                keyVital: 'Cr: 2.1 mg/dL • Urine: 0.32 mL/kg/h • FeNa: < 1%',
                perfusion: 'Dual Insult: Low Inflow + High Venous Backpressure',
                risk: 'Rapid Cr doubling within 24h',
                drugResponse: 'Inotrope support to augment cardiac output',
                clinicalNote: 'Renal perfusion pressure compromised by low arterial pressure coupled with high central venous pressure (18 mmHg).',
                aiCallout: 'Renal venous congestion is the primary driver of worsening GFR in this cardiorenal presentation.',
                layer: ['organ', 'hemodynamic']
            },
            {
                id: 'periphery',
                name: 'Peripheral Microcirculation',
                severity: 'CRITICAL',
                reserve: 24,
                pin: { x: 56, y: 64 },
                cardPosition: 'bottom-right',
                pathology: 'Intense Peripheral Vasoconstriction',
                keyVital: 'CRT: 4.8s • Extremities: Cold & Pale',
                perfusion: 'Compensatory Sympathetic Vasoconstriction',
                risk: 'Severe peripheral hypoperfusion',
                drugResponse: 'Caution with vasopressors; inotrope preferred',
                clinicalNote: 'Extreme peripheral vasoconstriction with marked temperature gradient between core and periphery (ΔT: 4.8°C).',
                aiCallout: 'Body is aggressively diverting scarce stroke volume toward vital coronary and cerebral circuits.',
                layer: ['organ', 'cardio']
            }
        ]
    },
    {
        id: 'patient-ards',
        name: 'Sarah Miller',
        age: 48,
        gender: 'Female',
        bed: 'ICU Bed 02',
        mrn: 'MRN-784119',
        admissionDiagnosis: 'Severe ARDS / Aspiration Pneumonitis',
        riskWindow: '4 — 6 Hours',
        riskSubtitle: 'P/F ratio trajectory + ventilator mechanics index',
        primaryRisk: 'Severe Refractory Hypoxemia — loss of lung compliance, bilateral alveolar infiltrates, barotrauma risk.',
        aiInsight: 'Dynamic compliance has fallen to 22 mL/cmH2O. Driving pressure elevated at 17 cmH2O. Prone positioning protocol and neuromuscular blockade recommended.',
        vgiScore: 78,
        vgiStatus: 'CRITICAL',
        organs: [
            {
                id: 'brain',
                name: 'Brain & Cerebrovascular',
                severity: 'OPTIMAL',
                reserve: 72,
                pin: { x: 50, y: 10 },
                cardPosition: 'top-right',
                pathology: 'Sedated / RASS Target -4',
                keyVital: 'GCS: Sedated • Pupils: Equal & reactive',
                perfusion: 'Adequate Cerebral Perfusion Pressure',
                risk: 'Minimal acute cerebral injury',
                drugResponse: 'Propofol 30 mcg/kg/min + Fentanyl',
                clinicalNote: 'Patient deeply sedated for lung-protective ventilation compliance. No focal deficits.',
                aiCallout: 'Cerebral oxygen saturation (rSO2) stable at 68% on bilateral NIRS sensors.',
                layer: ['organ', 'cerebral']
            },
            {
                id: 'heart',
                name: 'Cardiovascular & Myocardium',
                severity: 'WARNING',
                reserve: 52,
                pin: { x: 51, y: 26 },
                cardPosition: 'mid-right',
                pathology: 'Acute Cor Pulmonale Risk / RV Strain',
                keyVital: 'HR: 98 bpm • MAP: 74 mmHg • CVP: 14 mmHg',
                perfusion: 'Elevated Pulmonary Vascular Resistance',
                risk: 'Acute right ventricular overload',
                drugResponse: 'Avoid hypercapnic vasoconstriction',
                clinicalNote: 'Right ventricle moderately dilated on bedside echocardiogram due to high transpulmonary pressures.',
                aiCallout: 'Elevated PEEP and driving pressure exerting afterload strain on right ventricle.',
                layer: ['organ', 'cardio', 'respiratory']
            },
            {
                id: 'right-lung',
                name: 'Right Lung',
                severity: 'CRITICAL',
                reserve: 18,
                pin: { x: 44, y: 28 },
                cardPosition: 'mid-left',
                pathology: 'Severe ARDS / Dependent Consolidation',
                keyVital: 'PaO2/FiO2: 112 • PEEP: 14 cmH2O • SpO2: 89%',
                perfusion: 'Severe Shunt Fraction (38%)',
                risk: 'Refractory life-threatening hypoxemia',
                drugResponse: 'Lung protective ventilation (6 mL/kg PBW)',
                clinicalNote: 'Extensive bilateral ground-glass opacities and dependent consolidation. Driving pressure 17 cmH2O.',
                aiCallout: 'Severe P/F ratio deficit (< 150) meets criteria for 16-hour prone positioning maneuver.',
                layer: ['organ', 'respiratory']
            },
            {
                id: 'left-lung',
                name: 'Left Lung',
                severity: 'CRITICAL',
                reserve: 22,
                pin: { x: 57, y: 28 },
                cardPosition: 'mid-right',
                pathology: 'Severe ARDS / Alveolar Collapse',
                keyVital: 'Compliance: 22 mL/cmH2O • Plateau: 31 cmH2O',
                perfusion: 'High Shunt Physiology',
                risk: 'Volutrauma / Atelectrauma',
                drugResponse: 'Paralytic infusion (Cisatracurium)',
                clinicalNote: 'Severe decrease in functional residual capacity with diffuse consolidation.',
                aiCallout: 'Recruitment potential exists in dorsal lung segments if proned within the next 3 hours.',
                layer: ['organ', 'respiratory']
            },
            {
                id: 'liver',
                name: 'Liver & Hepatosplanchnic',
                severity: 'OPTIMAL',
                reserve: 78,
                pin: { x: 44, y: 35 },
                cardPosition: 'mid-left',
                pathology: 'Preserved Hepatic Function',
                keyVital: 'Bilirubin: 1.1 mg/dL • ALT: 34 U/L • AST: 41 U/L',
                perfusion: 'Adequate Microperfusion',
                risk: 'Low deterioration risk',
                drugResponse: 'Normal maintenance',
                clinicalNote: 'Liver enzymes remain within acceptable clinical targets.',
                aiCallout: 'Hepatosplanchnic reserves remain intact.',
                layer: ['organ']
            },
            {
                id: 'abdomen',
                name: 'Gastrointestinal & Mesentery',
                severity: 'OPTIMAL',
                reserve: 82,
                pin: { x: 50, y: 42 },
                cardPosition: 'bottom-left',
                pathology: 'Normal Splanchnic Function',
                keyVital: 'Lactate: 1.6 mmol/L • Enteral feeds tolerated',
                perfusion: 'Well-perfused bowel loops',
                risk: 'Low risk',
                drugResponse: 'Trophic enteral nutrition active',
                clinicalNote: 'Trophic feeds continuing via nasogastric tube with minimal residual volumes.',
                aiCallout: 'Nutritional status supportive of lung recovery.',
                layer: ['organ']
            },
            {
                id: 'kidneys',
                name: 'Renal System (Bilateral Kidneys)',
                severity: 'WARNING',
                reserve: 62,
                pin: { x: 52, y: 39 },
                cardPosition: 'mid-right',
                pathology: 'High PEEP Hemodynamic Impact',
                keyVital: 'Cr: 1.3 mg/dL • Urine: 0.65 mL/kg/h',
                perfusion: 'Mild venous backpressure from PEEP',
                risk: 'Mild pre-renal strain',
                drugResponse: 'Conservative fluid management protocol',
                clinicalNote: 'Urine output adequate under fluid restriction protocol for ARDS management.',
                aiCallout: 'Renal function holding steady under FACTT fluid-conservative protocol.',
                layer: ['organ']
            },
            {
                id: 'periphery',
                name: 'Peripheral Microcirculation',
                severity: 'OPTIMAL',
                reserve: 75,
                pin: { x: 56, y: 64 },
                cardPosition: 'bottom-right',
                pathology: 'Normal Peripheral Capillary Transit',
                keyVital: 'CRT: 2.1s • Warm distal extremities',
                perfusion: 'Preserved Peripheral Perfusion',
                risk: 'Low shock risk',
                drugResponse: 'No vasopressors required',
                clinicalNote: 'Distal pulses bounding and extremities warm with brisk capillary refill.',
                aiCallout: 'Systemic macro- and micro-hemodynamics are stable; pathology isolated to pulmonary failure.',
                layer: ['organ', 'cardio']
            }
        ]
    }
];

// Visualization Layers available
const VISUALIZATION_LAYERS = [
    { id: 'organ', label: 'Organ Deterioration', icon: '⚡' },
    { id: 'hemodynamic', label: 'Hemodynamic Heatmap', icon: '🩸' },
    { id: 'respiratory', label: 'Respiratory & SpO2', icon: '🫁' },
    { id: 'cardio', label: 'Cardiovascular & Perfusion', icon: '💓' },
    { id: 'cerebral', label: 'Cerebral & Autonomic', icon: '🧠' },
];

export default function AnatomyTwinPage() {
    const { patientId } = useAuth();
    const navigate = useNavigate();

    // -------------------------------------------------------
    // REAL CAMERA VITALS SYNC — Read from localStorage cache
    // written by CameraVisionPage every time a frame is captured
    // -------------------------------------------------------
    const [cameraVitals, setCameraVitals] = useState(null);
    const [cameraPatient, setCameraPatient] = useState(null);

    useEffect(() => {
        const readCameraVitals = () => {
            try {
                const raw = localStorage.getItem('vg_last_camera_vitals');
                if (!raw) return;
                const v = JSON.parse(raw);
                if (!v.face_detected) return;

                // Timestamp guard: only use data from within the last 30 seconds
                const ageMs = new Date() - new Date(v.timestamp);
                if (ageMs > 30000) return;

                setCameraVitals(v);

                // Derive organ severity / reserve from the real camera vitals
                const hr = v.heart_rate || 72;
                const rr = v.respiratory_rate || 16;
                const spo2 = v.spo2 || 98;
                const cyanosis = !!v.cyanosis_risk;
                const pain = v.pain_score || 0;
                const sbp = v.systolic_bp || 120;

                // Heart severity
                const heartSev = hr > 130 || hr < 45 ? 'CRITICAL' : hr > 110 || hr < 55 ? 'WARNING' : 'OPTIMAL';
                const heartRes = heartSev === 'CRITICAL' ? 22 : heartSev === 'WARNING' ? 52 : 82;
                const heartHR = `HR: ${hr} bpm • BP: ${sbp}/${v.diastolic_bp || 80} mmHg`;

                // Lung severity
                const lungSev = spo2 < 88 || rr > 28 ? 'CRITICAL' : spo2 < 92 || rr > 22 ? 'WARNING' : 'OPTIMAL';
                const lungRes = lungSev === 'CRITICAL' ? 18 : lungSev === 'WARNING' ? 55 : 80;

                // Brain severity (pain + cyanosis => cerebral hypoperfusion risk)
                const brainSev = cyanosis || pain >= 3 ? 'CRITICAL' : pain >= 2 ? 'WARNING' : 'OPTIMAL';
                const brainRes = brainSev === 'CRITICAL' ? 30 : brainSev === 'WARNING' ? 60 : 85;

                // Kidney/periphery: coarse proxy from HR & SPo2
                const kidneyWarning = spo2 < 93 || hr > 115;
                const kidneySev = spo2 < 88 ? 'CRITICAL' : kidneyWarning ? 'WARNING' : 'OPTIMAL';
                const kidneyRes = kidneySev === 'CRITICAL' ? 28 : kidneySev === 'WARNING' ? 58 : 78;

                // VGI score
                let vgi = 20;
                if (hr > 120 || hr < 50) vgi += 35; else if (hr > 100 || hr < 60) vgi += 18; else if (hr > 90) vgi += 8;
                if (rr > 26 || rr < 10) vgi += 30; else if (rr > 20 || rr < 12) vgi += 14;
                if (pain >= 3) vgi += 15;
                if (cyanosis) vgi += 35;
                vgi = Math.min(99, Math.max(12, vgi));

                const riskWindow = vgi >= 80 ? '0 — 2 Hours' : vgi >= 55 ? '2 — 4 Hours' : '> 6 Hours';

                // Build live camera patient
                const livePt = {
                    id: 'patient-live-camera',
                    name: `${patientId || 'Live Patient'} (Camera)`,
                    age: '--',
                    gender: 'Live Feed',
                    bed: 'Camera Vision Station',
                    mrn: `VG-LIVE-${new Date().toISOString().slice(11,19).replace(/:/g,'')}`,
                    admissionDiagnosis: 'Real-Time Camera Physiological Monitoring',
                    riskWindow,
                    riskSubtitle: `Live rPPG heart rate ${hr} bpm • SpO₂ ${spo2}% • RR ${rr} rpm`,
                    primaryRisk: heartSev === 'CRITICAL'
                        ? `Critical tachycardia (${hr} bpm) with SpO₂ ${spo2}% — hemodynamic derangement detected.`
                        : lungSev === 'CRITICAL'
                        ? `Severe hypoxemia (SpO₂ ${spo2}%) with tachypnea (RR ${rr} rpm) — respiratory failure risk.`
                        : `Physiological parameters ${heartSev === 'OPTIMAL' && lungSev === 'OPTIMAL' ? 'stable and within normal range' : 'showing mild derangement — monitor closely'}.`,
                    aiInsight: `Live rPPG reading: Heart Rate ${hr} bpm (${heartSev.toLowerCase()}). SpO₂ estimated ${spo2}%. Respiratory Rate ${rr} rpm. Facial pain score ${pain}/5.${cyanosis ? ' Perioral cyanosis detected — possible hypoxemia. Oxygen supplementation advised.' : ' No peripheral cyanosis detected.'}`,
                    vgiScore: vgi,
                    vgiStatus: vgi >= 80 ? 'CRITICAL' : vgi >= 50 ? 'WARNING' : 'STABLE',
                    organs: [
                        {
                            id: 'brain', name: 'Brain & Cerebrovascular', severity: brainSev, reserve: brainRes,
                            pin: { x: 50, y: 10 }, cardPosition: 'top-right',
                            pathology: brainSev === 'CRITICAL' ? (cyanosis ? 'Cerebral Hypoxia / Cyanosis' : 'Acute Pain Response / Distress') : brainSev === 'WARNING' ? 'Moderate Facial Tension / Mild Pain' : 'Normal Cerebral Function',
                            keyVital: `Pain Score: ${pain}/5 • Cyanosis: ${cyanosis ? 'YES ⚠️' : 'No'}`,
                            perfusion: cyanosis ? 'Possible Cerebral Hypoperfusion' : 'Normal Cerebral Perfusion',
                            risk: brainSev === 'CRITICAL' ? 'High encephalopathy / hypoxia risk' : 'Low',
                            drugResponse: cyanosis ? 'O₂ supplementation indicated' : 'None required',
                            clinicalNote: cyanosis
                                ? `Camera detected perioral blue-shift (cyanosis). SpO₂ estimated at ${spo2}%. Potential cerebral oxygen deficit.`
                                : `No cyanosis detected. Facial muscle tension pain score ${pain}/5 via landmark analysis.`,
                            aiCallout: cyanosis
                                ? 'Perioral cyanosis strongly correlates with SpO₂ < 90%. Cerebral oxygenation may be compromised.'
                                : `Facial pain landmarks: ${pain >= 3 ? 'Significant brow furrow and mouth tension detected.' : 'Relaxed musculature — no acute distress.'}`,
                            layer: ['organ', 'cerebral', 'hemodynamic']
                        },
                        {
                            id: 'heart', name: 'Cardiovascular & Myocardium', severity: heartSev, reserve: heartRes,
                            pin: { x: 51, y: 26 }, cardPosition: 'mid-right',
                            pathology: heartSev === 'CRITICAL' ? (hr > 130 ? 'Severe Tachycardia' : 'Severe Bradycardia') : heartSev === 'WARNING' ? (hr > 110 ? 'Tachycardia' : 'Bradycardia') : 'Normal Sinus Rhythm',
                            keyVital: heartHR,
                            perfusion: hr > 120 ? 'Reduced Diastolic Filling Time' : hr < 50 ? 'Low Cardiac Output Risk' : 'Adequate Cardiac Perfusion',
                            risk: heartSev === 'CRITICAL' ? 'High haemodynamic instability risk' : heartSev === 'WARNING' ? 'Moderate arrhythmia risk' : 'Minimal',
                            drugResponse: hr > 120 ? 'Rate control — beta-blocker evaluation' : hr < 50 ? 'Atropine / pacing evaluation' : 'Continue monitoring',
                            clinicalNote: `Live rPPG measurement via green-channel facial reflectance: ${hr} bpm. BP estimated ${sbp}/${v.diastolic_bp || 80} mmHg based on heart rate pattern.`,
                            aiCallout: hr > 120
                                ? `Tachycardia at ${hr} bpm reduces diastolic perfusion time. Risk of subendocardial ischemia if sustained > 30 min.`
                                : hr < 50
                                ? `Bradycardia at ${hr} bpm. Cardiac output may be insufficient for tissue perfusion demands.`
                                : `Heart rate ${hr} bpm within normal range. rPPG waveform quality: good.`,
                            layer: ['organ', 'cardio', 'hemodynamic']
                        },
                        {
                            id: 'right-lung', name: 'Right Lung', severity: lungSev, reserve: lungRes,
                            pin: { x: 44, y: 28 }, cardPosition: 'mid-left',
                            pathology: spo2 < 88 ? 'Severe Hypoxemia / Possible ARDS' : spo2 < 92 ? 'Moderate Hypoxemia' : 'Normal Oxygenation',
                            keyVital: `SpO₂: ${spo2}% • RR: ${rr} rpm`,
                            perfusion: spo2 < 90 ? 'Severe V/Q Mismatch' : spo2 < 94 ? 'Mild V/Q Mismatch' : 'Normal',
                            risk: lungSev === 'CRITICAL' ? 'Acute respiratory failure' : lungSev === 'WARNING' ? 'Supplemental O₂ required' : 'Low',
                            drugResponse: spo2 < 90 ? 'High-flow O₂ / CPAP indicated' : spo2 < 94 ? 'Supplemental O₂ 2-4 L/min' : 'Room air sufficient',
                            clinicalNote: cyanosis
                                ? `Lip cyanosis observed by camera. SpO₂ ${spo2}% confirms peripheral desaturation.`
                                : `SpO₂ ${spo2}%. Respiratory rate ${rr} rpm detected via chest motion tracking.`,
                            aiCallout: spo2 < 90
                                ? `SpO₂ ${spo2}% is critically below safe threshold of 95%. Immediate oxygenation support required.`
                                : rr > 22
                                ? `Tachypnea at ${rr} rpm despite SpO₂ ${spo2}% — possible compensatory hyperventilation.`
                                : `Oxygenation and ventilation within acceptable limits (SpO₂ ${spo2}%, RR ${rr} rpm).`,
                            layer: ['organ', 'respiratory']
                        },
                        {
                            id: 'left-lung', name: 'Left Lung', severity: lungSev, reserve: Math.max(10, lungRes - 5),
                            pin: { x: 57, y: 28 }, cardPosition: 'mid-right',
                            pathology: rr > 24 ? 'Compensatory Tachypnea' : 'Normal Lung Function',
                            keyVital: `RR: ${rr} rpm • SpO₂: ${spo2}%`,
                            perfusion: 'Estimated from chest motion tracking',
                            risk: rr > 24 ? 'Respiratory muscle fatigue' : 'Low',
                            drugResponse: rr > 24 ? 'Non-invasive ventilation assessment' : 'None required',
                            clinicalNote: `Chest motion tracking registered ${rr} respiratory excursions per minute. Left hemithorax symmetry normal.`,
                            aiCallout: rr > 24
                                ? `Tachypnea ${rr} rpm may indicate increased work of breathing — assess for underlying cause.`
                                : `Respiratory mechanics appear normal at ${rr} rpm.`,
                            layer: ['organ', 'respiratory']
                        },
                        {
                            id: 'liver', name: 'Liver & Hepatosplanchnic', severity: spo2 < 88 ? 'CRITICAL' : spo2 < 94 || hr > 120 ? 'WARNING' : 'OPTIMAL',
                            reserve: spo2 < 88 ? 25 : spo2 < 94 ? 60 : 82,
                            pin: { x: 44, y: 35 }, cardPosition: 'mid-left',
                            pathology: spo2 < 90 ? 'Hypoxic Hepatopathy Risk' : 'Preserved Hepatic Function',
                            keyVital: `Inferred from SpO₂ ${spo2}% and HR ${hr} bpm`,
                            perfusion: spo2 < 90 ? 'Potential Hepatic Hypoperfusion' : 'Normal',
                            risk: spo2 < 90 ? 'Secondary hypoxic hepatitis' : 'Low',
                            drugResponse: 'Optimize perfusion',
                            clinicalNote: 'Hepatic function inferred indirectly from camera-detected SpO₂ and circulatory status.',
                            aiCallout: spo2 < 90 ? 'Low SpO₂ may result in hepatic oxygen deficit over time.' : 'Splanchnic perfusion adequate based on systemic hemodynamics.',
                            layer: ['organ', 'hemodynamic']
                        },
                        {
                            id: 'abdomen', name: 'Gastrointestinal & Mesentery', severity: hr > 125 ? 'CRITICAL' : hr > 110 ? 'WARNING' : 'OPTIMAL',
                            reserve: hr > 125 ? 20 : hr > 110 ? 55 : 80,
                            pin: { x: 50, y: 42 }, cardPosition: 'bottom-left',
                            pathology: hr > 125 ? 'Mesenteric Hypoperfusion Risk' : 'Normal Splanchnic Flow',
                            keyVital: `Estimated from HR ${hr} bpm`,
                            perfusion: hr > 125 ? 'Reduced Splanchnic Perfusion' : 'Adequate',
                            risk: hr > 125 ? 'Mucosal barrier compromise' : 'Low',
                            drugResponse: 'Fluid balance optimization',
                            clinicalNote: 'Mesenteric flow estimated from cardiac output proxy via heart rate.',
                            aiCallout: hr > 125 ? 'Severe tachycardia reduces splanchnic flow. Ileus and bacterial translocation risk elevated.' : 'Gut perfusion estimated normal.',
                            layer: ['organ']
                        },
                        {
                            id: 'kidneys', name: 'Renal System (Bilateral Kidneys)', severity: kidneySev, reserve: kidneyRes,
                            pin: { x: 52, y: 39 }, cardPosition: 'mid-right',
                            pathology: kidneySev === 'CRITICAL' ? 'Renal Hypoperfusion / AKI Risk' : kidneySev === 'WARNING' ? 'Borderline Renal Perfusion' : 'Normal Renal Function',
                            keyVital: `SpO₂: ${spo2}% • HR: ${hr} bpm (proxy for renal blood flow)`,
                            perfusion: kidneySev === 'CRITICAL' ? 'Severe Renal Cortical Hypoperfusion' : kidneySev === 'WARNING' ? 'Reduced Renal Perfusion' : 'Adequate',
                            risk: kidneySev === 'CRITICAL' ? 'Acute Kidney Injury' : 'Low',
                            drugResponse: kidneySev !== 'OPTIMAL' ? 'Maintain MAP > 65 mmHg, avoid nephrotoxics' : 'Routine monitoring',
                            clinicalNote: `Renal perfusion estimated from SpO₂ ${spo2}% and HR ${hr} bpm proxy measurements.`,
                            aiCallout: kidneySev !== 'OPTIMAL' ? `Combined low SpO₂ (${spo2}%) and tachycardia (${hr} bpm) raise renal cortical ischemia risk.` : 'Renal perfusion markers appear adequate.',
                            layer: ['organ', 'hemodynamic']
                        },
                        {
                            id: 'periphery', name: 'Peripheral Microcirculation', severity: cyanosis ? 'CRITICAL' : spo2 < 92 ? 'WARNING' : 'OPTIMAL',
                            reserve: cyanosis ? 20 : spo2 < 92 ? 50 : 82,
                            pin: { x: 56, y: 64 }, cardPosition: 'bottom-right',
                            pathology: cyanosis ? 'Peripheral Cyanosis & Desaturation' : spo2 < 92 ? 'Mild Peripheral Vasoconstriction' : 'Normal Microcirculation',
                            keyVital: `SpO₂: ${spo2}% • Lip Cyanosis: ${cyanosis ? 'Detected' : 'Absent'}`,
                            perfusion: cyanosis ? 'Severe Peripheral Desaturation' : 'Adequate',
                            risk: cyanosis ? 'Peripheral tissue hypoxia' : 'Low',
                            drugResponse: cyanosis ? 'Oxygen therapy • Vasodilator assessment' : 'None required',
                            clinicalNote: cyanosis
                                ? 'Camera detected blue-shifted reflectance in perioral region. Consistent with peripheral cyanosis and SpO₂ < 90%.'
                                : `Normal skin tone reflectance. SpO₂ ${spo2}% consistent with adequate peripheral oxygenation.`,
                            aiCallout: cyanosis
                                ? 'Perioral cyanosis is a visible sign of significant oxygen desaturation. Oxygen supplementation urgently required.'
                                : 'No peripheral cyanosis. Microvascular circulation appears intact.',
                            layer: ['organ', 'cardio', 'hemodynamic']
                        }
                    ]
                };
                setCameraPatient(livePt);
            } catch (err) {
                // ignore parse errors
            }
        };

        readCameraVitals();
        const interval = setInterval(readCameraVitals, 2000); // poll localStorage every 2s
        return () => clearInterval(interval);
    }, [patientId]);

    // State
    const [selectedPatientId, setSelectedPatientId] = useState('patient-sepsis');
    const [selectedLayer, setSelectedLayer] = useState('organ');
    const [severityFilter, setSeverityFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrganId, setSelectedOrganId] = useState('heart');
    const [pinnedCards, setPinnedCards] = useState(['brain', 'heart', 'liver', 'abdomen']);
    const [copilotOpen, setCopilotOpen] = useState(false);
    const [copilotQuery, setCopilotQuery] = useState('');
    const [copilotMessages, setCopilotMessages] = useState([
        { role: 'assistant', text: 'Clinical AI Copilot active. Monitoring 3D Twin decompensation vectors. Ask any query regarding organ perfusion, vasopressor response, or deterioration timeline.' }
    ]);

    // Build patient list: inject live camera patient at top if available
    const allPatients = cameraPatient
        ? [cameraPatient, ...CLINICAL_PATIENTS]
        : CLINICAL_PATIENTS;

    // Auto-select live camera patient when it first becomes available
    useEffect(() => {
        if (cameraPatient && selectedPatientId === 'patient-sepsis') {
            setSelectedPatientId('patient-live-camera');
        }
    }, [cameraPatient !== null]);

    // Active patient object
    const activePatient = allPatients.find(p => p.id === selectedPatientId) || allPatients[0];

    // Filtered organs
    const filteredOrgans = activePatient.organs.filter(organ => {
        if (severityFilter === 'CRITICAL' && organ.severity !== 'CRITICAL') return false;
        if (severityFilter === 'WARNING' && organ.severity !== 'WARNING') return false;
        if (severityFilter === 'OPTIMAL' && organ.severity !== 'OPTIMAL') return false;
        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase();
            return organ.name.toLowerCase().includes(q) || organ.pathology.toLowerCase().includes(q);
        }
        return true;
    });

    // Check if organ is highlighted in active layer
    const isOrganInLayer = (organ) => {
        if (selectedLayer === 'organ') return true;
        return organ.layer.includes(selectedLayer);
    };

    // Toggle card pin
    const toggleCard = (organId) => {
        if (pinnedCards.includes(organId)) {
            setPinnedCards(pinnedCards.filter(id => id !== organId));
        } else {
            setPinnedCards([...pinnedCards, organId]);
        }
        setSelectedOrganId(organId);
    };

    // Close card
    const closeCard = (organId, e) => {
        e.stopPropagation();
        setPinnedCards(pinnedCards.filter(id => id !== organId));
    };

    // Send AI Copilot question
    const handleCopilotSend = () => {
        if (!copilotQuery.trim()) return;
        const userQ = copilotQuery;
        setCopilotMessages(prev => [...prev, { role: 'user', text: userQ }]);
        setCopilotQuery('');

        // Generate tailored clinical response
        setTimeout(() => {
            let reply = '';
            const qLower = userQ.toLowerCase();
            if (qLower.includes('lactate') || qLower.includes('shock') || qLower.includes('perfusion')) {
                reply = `For ${activePatient.name} (${activePatient.bed}), arterial lactate is tracking at 4.4 mmol/L with a doubling velocity of 0.8 mmol/L/hr. Microvascular transit time in mesenteric and renal beds is critically reduced. Recommend titrating Norepinephrine to achieve MAP > 65 mmHg and checking ScvO2.`;
            } else if (qLower.includes('lung') || qLower.includes('spo2') || qLower.includes('pao2') || qLower.includes('respiratory')) {
                reply = `Pulmonary twin assessment: P/F ratio is currently ${activePatient.organs.find(o => o.id.includes('lung'))?.keyVital || 'compromised'}. Shunt fraction is elevated. If driving pressure exceeds 15 cmH2O, consider early prone protocol or recruitment maneuvers.`;
            } else if (qLower.includes('kidney') || qLower.includes('renal') || qLower.includes('urine')) {
                reply = `Renal reserve is at 26%. Patient meets KDIGO Stage 2 criteria with urine output < 0.3 mL/kg/h for 4 consecutive hours. High risk of transitioning to CRRT if perfusion deficit is not reversed within 120 minutes.`;
            } else {
                reply = `AI Predictive Analysis: ${activePatient.name} has a composite VGI score of ${activePatient.vgiScore}/100 (${activePatient.vgiStatus}). Immediate priority is hemodynamic stabilization and reversal of mesenteric hypoperfusion. Risk of multi-organ failure cascade within ${activePatient.riskWindow}.`;
            }
            setCopilotMessages(prev => [...prev, { role: 'assistant', text: reply }]);
        }, 600);
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[#070b13] text-slate-100 font-sans selection:bg-cyan-500/30">
            {/* Sidebar Navigation */}
            <Sidebar />

            {/* Main Command Center Container */}
            <main className="flex-1 ml-64 flex flex-col h-full overflow-hidden relative">

                {/* Top Command Center Header */}
                <header className="h-16 border-b border-cyan-500/20 bg-[#090e18]/90 backdrop-blur-md px-6 flex items-center justify-between z-30 shrink-0">
                    {/* Brand & Project Identity */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xl font-black tracking-widest bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                                VITAL-GUARD
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
                                V2.4 • ICU 3D DIGITAL TWIN
                            </span>
                        </div>
                    </div>

                    {/* Center Search & AI Prompt Bar */}
                    <div className="flex-1 max-w-2xl mx-8">
                        <div className="relative flex items-center">
                            <svg className="w-4 h-4 absolute left-3.5 text-cyan-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search ICU patients, organ systems, biomarkers, ABG, hemodynamic trajectory..."
                                className="w-full bg-[#0d1527] border border-cyan-500/30 rounded-xl pl-10 pr-32 py-2 text-xs text-cyan-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 shadow-inner transition-all"
                            />
                            <div className="absolute right-2 flex items-center gap-2">
                                <button
                                    onClick={() => setCopilotOpen(true)}
                                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-95 transition-all"
                                >
                                    <svg className="w-3.5 h-3.5 text-cyan-200 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Ask Copilot
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Controls: Patient / Unit Filter, Severity Filter */}
                    <div className="flex items-center gap-3">
                        {/* Patient Dropdown */}
                        <div className="relative">
                            <select
                                value={selectedPatientId}
                                onChange={(e) => setSelectedPatientId(e.target.value)}
                                className="bg-[#0f172a] text-xs font-semibold text-cyan-200 border border-cyan-500/30 rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-400 cursor-pointer shadow-sm hover:border-cyan-400/60 transition-all"
                            >
                                {allPatients.map(p => (
                                    <option key={p.id} value={p.id} className="bg-[#0f172a] text-slate-200">
                                        {p.id === 'patient-live-camera' ? '📷 LIVE' : p.bed} — {p.name} ({p.admissionDiagnosis.slice(0, 22)}...)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Severity Filter Dropdown */}
                        <div className="relative">
                            <select
                                value={severityFilter}
                                onChange={(e) => setSeverityFilter(e.target.value)}
                                className="bg-[#0f172a] text-xs font-semibold text-slate-300 border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-400 cursor-pointer shadow-sm hover:border-slate-500 transition-all"
                            >
                                <option value="ALL">All Severities</option>
                                <option value="CRITICAL">🔴 Critical Only</option>
                                <option value="WARNING">🟡 Warning Only</option>
                                <option value="OPTIMAL">🟢 Optimal Only</option>
                            </select>
                        </div>

                        {/* Alarm Bell Button */}
                        <button
                            onClick={() => alert(`Active ICU Alerts: 3 Critical Organ Hazards detected for ${activePatient.name}. Immediate bedside review recommended.`)}
                            className="p-2 rounded-xl bg-[#0f172a] border border-red-500/40 text-red-400 hover:text-white hover:bg-red-950/50 shadow-[0_0_12px_rgba(239,68,68,0.25)] relative transition-all"
                            title="Active Clinical Alerts"
                        >
                            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                        </button>
                    </div>
                </header>

                {/* 3-Column Command Center Workspace */}
                <div className="flex-1 flex overflow-hidden relative">

                    {/* ========================================================
                        LEFT COLUMN: Patient Demographics, Decompensation
                        Prediction Window, Physiological Layers & AI Insight
                       ======================================================== */}
                    <div className="w-[300px] xl:w-[320px] bg-[#080d17]/95 border-r border-cyan-500/20 flex flex-col p-4 overflow-y-auto shrink-0 z-20 space-y-4">

                        {/* Live Camera Sync Banner — shown when real camera vitals are being used */}
                        {activePatient.id === 'patient-live-camera' && cameraVitals && (
                            <div className="bg-gradient-to-r from-cyan-950/60 to-[#0e1626] rounded-2xl p-3 border border-cyan-400/60 shadow-[0_0_18px_rgba(6,182,212,0.3)] flex items-center gap-3">
                                <div className="relative w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center flex-shrink-0">
                                    <span className="text-base">📷</span>
                                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 animate-ping"></span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-extrabold text-cyan-300 uppercase tracking-wider">🔴 LIVE Camera Data Active</p>
                                    <p className="text-[10px] text-cyan-100 font-mono truncate">
                                        HR {cameraVitals.heart_rate} bpm • SpO₂ {cameraVitals.spo2}% • RR {cameraVitals.respiratory_rate} rpm
                                    </p>
                                </div>
                                <button
                                    onClick={() => navigate('/camera-vision')}
                                    className="text-[9px] font-bold text-cyan-400 hover:text-white px-1.5 py-1 rounded border border-cyan-500/40 hover:bg-cyan-900/50 transition-all flex-shrink-0"
                                    title="Back to Camera Vision"
                                >
                                    📹
                                </button>
                            </div>
                        )}

                        {/* Patient Profile Card */}
                        <div className="bg-[#0e1626]/80 rounded-2xl p-4 border border-cyan-500/20 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none"></div>
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">PATIENT TWIN PROFILE</span>
                                    <h2 className="text-base font-bold text-white mt-0.5">{activePatient.name}</h2>
                                    <p className="text-xs text-slate-400">{activePatient.age} Yrs • {activePatient.gender} • <span className="text-cyan-300 font-semibold">{activePatient.bed}</span></p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-slate-500 block font-mono">RECORD</span>
                                    <span className="text-xs font-mono font-bold text-slate-300">{activePatient.mrn}</span>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-800">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Admission Diagnosis</span>
                                <p className="text-xs font-medium text-slate-200 mt-0.5 line-clamp-2">{activePatient.admissionDiagnosis}</p>
                            </div>
                        </div>

                        {/* Decompensation Risk Window (Replicating "Postmortem Interval" in forensic image) */}
                        <div className="bg-[#0e1626]/80 rounded-2xl p-4 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)] relative">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                                    DECOMPENSATION RISK WINDOW
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/40">
                                    VGI {activePatient.vgiScore}/100
                                </span>
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-black tracking-tight text-white font-mono">{activePatient.riskWindow}</span>
                                <span className="text-xs text-red-300 font-medium">to critical decompensation</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">{activePatient.riskSubtitle}</p>
                        </div>

                        {/* Visualization Layers (Interactive Tabs) */}
                        <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 px-1">
                                VISUALIZATION LAYER
                            </span>
                            <div className="space-y-1.5">
                                {VISUALIZATION_LAYERS.map((layer) => {
                                    const isActive = selectedLayer === layer.id;
                                    return (
                                        <button
                                            key={layer.id}
                                            onClick={() => setSelectedLayer(layer.id)}
                                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                                                isActive
                                                    ? 'bg-gradient-to-r from-cyan-950/80 to-[#10233b] border-cyan-400/80 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)] translate-x-1'
                                                    : 'bg-[#0e1626]/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-sm">{layer.icon}</span>
                                                <span>{layer.label}</span>
                                            </div>
                                            {isActive && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Live AI Insight (Glowing Purple/Violet Box as in reference) */}
                        <div className="bg-gradient-to-br from-purple-950/40 via-[#18112e] to-[#0e1626] rounded-2xl p-3.5 border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                            <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[10px] uppercase tracking-wider mb-1.5">
                                <svg className="w-3.5 h-3.5 text-purple-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                LIVE CLINICAL AI INSIGHT
                            </div>
                            <p className="text-[11px] leading-relaxed text-purple-100 font-normal">
                                {activePatient.aiInsight}
                            </p>
                        </div>

                        {/* Primary Adverse Deterioration (Red Box as in reference "Cause of Death") */}
                        <div className="bg-gradient-to-br from-red-950/30 to-[#0e1626] rounded-2xl p-3.5 border border-red-500/30">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 block mb-1">
                                PRIMARY ADVERSE DETERIORATION PATHWAY
                            </span>
                            <p className="text-xs text-red-200 font-medium leading-relaxed">
                                {activePatient.primaryRisk}
                            </p>
                        </div>

                    </div>


                    {/* ========================================================
                        CENTER COLUMN: 3D Holographic Transparent Body Model,
                        Interactive Organ Coordinate Pins, SVG Connecting Lines &
                        Floating Clinical Diagnosis Cards
                       ======================================================== */}
                    <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-radial from-[#0e1a2f]/40 via-[#070b13] to-[#05080e]">

                        {/* Ambient High-Tech Holographic Grid / Scanlines Overlay */}
                        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent pointer-events-none"></div>

                        {/* Central Holographic Body Display Container */}
                        <div className="relative w-full max-w-[540px] h-[92%] flex items-center justify-center select-none">

                            {/* The 3D Anatomical Twin Image */}
                            <img
                                src="/anatomy_twin.jpg"
                                alt="Holographic 3D Anatomical Digital Twin"
                                className="w-full h-full object-contain filter drop-shadow-[0_0_35px_rgba(6,182,212,0.25)] pointer-events-none"
                            />

                            {/* High-Tech Circular Coordinate Rings around the twin */}
                            <div className="absolute top-[26%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-12 rounded-full border border-cyan-500/20 border-dashed pointer-events-none animate-[spin_20s_linear_infinite]"></div>
                            <div className="absolute top-[72%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-14 rounded-full border border-cyan-500/15 border-dashed pointer-events-none animate-[spin_25s_linear_infinite_reverse]"></div>

                            {/* SVG Leader Lines: Connecting Pins to Floating Diagnosis Cards */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                                <defs>
                                    <linearGradient id="cyanLine" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
                                    </linearGradient>
                                    <linearGradient id="redLine" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
                                    </linearGradient>
                                </defs>

                                {/* Leader line for Brain */}
                                {pinnedCards.includes('brain') && (
                                    <line
                                        x1="50%" y1="10%"
                                        x2="78%" y2="12%"
                                        stroke="url(#redLine)"
                                        strokeWidth="1.5"
                                        strokeDasharray="4 4"
                                    />
                                )}

                                {/* Leader line for Heart */}
                                {pinnedCards.includes('heart') && (
                                    <line
                                        x1="51%" y1="26%"
                                        x2="78%" y2="34%"
                                        stroke="url(#redLine)"
                                        strokeWidth="1.5"
                                        strokeDasharray="4 4"
                                    />
                                )}

                                {/* Leader line for Abdomen */}
                                {pinnedCards.includes('abdomen') && (
                                    <line
                                        x1="50%" y1="42%"
                                        x2="22%" y2="52%"
                                        stroke="url(#redLine)"
                                        strokeWidth="1.5"
                                        strokeDasharray="4 4"
                                    />
                                )}

                                {/* Leader line for Liver */}
                                {pinnedCards.includes('liver') && (
                                    <line
                                        x1="44%" y1="35%"
                                        x2="22%" y2="35%"
                                        stroke="url(#redLine)"
                                        strokeWidth="1.5"
                                        strokeDasharray="4 4"
                                    />
                                )}
                            </svg>

                            {/* Interactive Organ Coordinate Pins */}
                            {activePatient.organs.map((organ) => {
                                const inLayer = isOrganInLayer(organ);
                                const isSelected = selectedOrganId === organ.id;
                                const isPinned = pinnedCards.includes(organ.id);

                                // Pin color based on organ severity
                                const pinColor = organ.severity === 'CRITICAL'
                                    ? 'bg-red-500 shadow-[0_0_15px_#ef4444]'
                                    : organ.severity === 'WARNING'
                                    ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]'
                                    : 'bg-emerald-400 shadow-[0_0_12px_#10b981]';

                                const pulseColor = organ.severity === 'CRITICAL'
                                    ? 'border-red-500/60'
                                    : organ.severity === 'WARNING'
                                    ? 'border-amber-400/60'
                                    : 'border-emerald-400/60';

                                return (
                                    <div
                                        key={organ.id}
                                        style={{ left: `${organ.pin.x}%`, top: `${organ.pin.y}%` }}
                                        onClick={() => toggleCard(organ.id)}
                                        className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group transition-all duration-300 ${
                                            inLayer ? 'opacity-100 scale-100' : 'opacity-20 scale-75'
                                        }`}
                                    >
                                        {/* Outer radar pulse wave */}
                                        <div className={`absolute -inset-2 rounded-full border ${pulseColor} animate-ping pointer-events-none`}></div>

                                        {/* Center solid interactive pin */}
                                        <div className={`w-3.5 h-3.5 rounded-full border-2 border-white ${pinColor} flex items-center justify-center transition-transform group-hover:scale-150 ${isSelected ? 'scale-125 ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#070b13]' : ''}`}>
                                            <div className="w-1 h-1 rounded-full bg-white"></div>
                                        </div>

                                        {/* Tooltip badge on hover */}
                                        <div className="absolute left-1/2 -translate-x-1/2 top-5 px-2 py-0.5 rounded bg-[#0b1322]/90 border border-cyan-500/40 text-[10px] font-bold text-cyan-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none shadow-xl transition-all z-30">
                                            {organ.name} ({organ.severity})
                                        </div>
                                    </div>
                                );
                            })}

                        </div>

                        {/* ========================================================
                            FLOATING DIAGNOSIS CARDS (Replicating Brain, Liver,
                            Abdomen popovers in the forensic reference image)
                           ======================================================== */}

                        {/* Top-Right Floating Card: Brain */}
                        {pinnedCards.includes('brain') && (
                            <FloatingDiagnosisCard
                                organ={activePatient.organs.find(o => o.id === 'brain')}
                                style={{ top: '6%', right: '2%', width: '290px' }}
                                onClose={(e) => closeCard('brain', e)}
                            />
                        )}

                        {/* Mid-Right Floating Card: Heart */}
                        {pinnedCards.includes('heart') && (
                            <FloatingDiagnosisCard
                                organ={activePatient.organs.find(o => o.id === 'heart')}
                                style={{ top: '34%', right: '2%', width: '290px' }}
                                onClose={(e) => closeCard('heart', e)}
                            />
                        )}

                        {/* Mid-Left Floating Card: Liver */}
                        {pinnedCards.includes('liver') && (
                            <FloatingDiagnosisCard
                                organ={activePatient.organs.find(o => o.id === 'liver')}
                                style={{ top: '22%', left: '2%', width: '280px' }}
                                onClose={(e) => closeCard('liver', e)}
                            />
                        )}

                        {/* Bottom-Left Floating Card: Abdomen */}
                        {pinnedCards.includes('abdomen') && (
                            <FloatingDiagnosisCard
                                organ={activePatient.organs.find(o => o.id === 'abdomen')}
                                style={{ bottom: '4%', left: '2%', width: '280px' }}
                                onClose={(e) => closeCard('abdomen', e)}
                            />
                        )}

                        {/* Floating 3D Controls overlay in center bottom */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#0b1325]/80 backdrop-blur-md border border-cyan-500/30 flex items-center gap-4 text-xs font-semibold text-slate-300 shadow-xl z-20">
                            <span className="text-cyan-400 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                                3D DIGITAL TWIN SYNCHRONIZED
                            </span>
                            <span className="text-slate-600">|</span>
                            <button
                                onClick={() => setPinnedCards(['brain', 'heart', 'liver', 'abdomen', 'kidneys'])}
                                className="text-cyan-300 hover:text-white transition-colors"
                            >
                                Expand All Cards
                            </button>
                            <span className="text-slate-600">|</span>
                            <button
                                onClick={() => setPinnedCards([])}
                                className="text-slate-400 hover:text-red-300 transition-colors"
                            >
                                Collapse Cards
                            </button>
                        </div>

                    </div>


                    {/* ========================================================
                        RIGHT COLUMN: Organ Health Status List (Progress bars,
                        biomarkers, severity badges, and severity legend)
                       ======================================================== */}
                    <div className="w-[310px] xl:w-[340px] bg-[#080d17]/95 border-l border-cyan-500/20 flex flex-col p-4 overflow-y-auto shrink-0 z-20 space-y-3">

                        {/* Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400">
                                    ORGAN HEALTH STATUS
                                </span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                                {filteredOrgans.length} SYSTEMS MONITORED
                            </span>
                        </div>

                        {/* Scrollable list of organ systems */}
                        <div className="space-y-2 flex-1">
                            {filteredOrgans.map((organ) => {
                                const isSelected = selectedOrganId === organ.id;
                                const isPinned = pinnedCards.includes(organ.id);

                                const badgeStyle = organ.severity === 'CRITICAL'
                                    ? 'bg-red-950/80 text-red-400 border-red-500/50'
                                    : organ.severity === 'WARNING'
                                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                                    : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50';

                                const progressColor = organ.severity === 'CRITICAL'
                                    ? 'from-red-600 to-rose-500'
                                    : organ.severity === 'WARNING'
                                    ? 'from-amber-500 to-yellow-400'
                                    : 'from-emerald-500 to-teal-400';

                                return (
                                    <div
                                        key={organ.id}
                                        onClick={() => toggleCard(organ.id)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                                            isSelected
                                                ? 'bg-[#121c2e] border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                                                : 'bg-[#0d1424]/70 border-slate-800/80 hover:border-slate-700 hover:bg-[#0f172a]'
                                        }`}
                                    >
                                        {/* Top row: Organ Name & Severity Badge */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                                                {organ.name}
                                            </span>
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${badgeStyle}`}>
                                                {organ.severity}
                                            </span>
                                        </div>

                                        {/* Vital / Pathology Snapshot */}
                                        <div className="text-[11px] text-slate-400 font-mono mt-1 truncate">
                                            {organ.keyVital}
                                        </div>

                                        {/* Health Reserve Progress Bar */}
                                        <div className="mt-2.5">
                                            <div className="flex items-center justify-between text-[10px] mb-1">
                                                <span className="text-slate-500 font-semibold">Organ Reserve</span>
                                                <span className="font-mono font-bold text-slate-300">{organ.reserve}%</span>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full bg-slate-800/90 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full bg-gradient-to-r ${progressColor} transition-all duration-700`}
                                                    style={{ width: `${organ.reserve}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Pin Indicator */}
                                        <div className="mt-2 flex items-center justify-between text-[10px]">
                                            <span className="text-slate-500">{organ.pathology}</span>
                                            <span className={`font-semibold ${isPinned ? 'text-cyan-400' : 'text-slate-600'}`}>
                                                {isPinned ? '📌 PINNED' : '+ PIN'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Severity Legend at Bottom of Right Panel */}
                        <div className="pt-3 border-t border-slate-800/80 text-[11px] space-y-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                                SEVERITY CLASSIFICATION
                            </span>
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-red-500 shadow-[0_0_6px_#ef4444]"></span>
                                    <span className="text-slate-300 text-[10px]">Critical (&lt;35%)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shadow-[0_0_6px_#f59e0b]"></span>
                                    <span className="text-slate-300 text-[10px]">Warning (35-70%)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 shadow-[0_0_6px_#10b981]"></span>
                                    <span className="text-slate-300 text-[10px]">Optimal (&gt;70%)</span>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

                {/* Floating AI Clinical Assistant FAB in bottom right corner */}
                <button
                    onClick={() => setCopilotOpen(!copilotOpen)}
                    className="fixed bottom-6 right-6 w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 text-white flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:scale-105 active:scale-95 transition-all z-40"
                    title="Open Clinical AI Copilot"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                </button>

                {/* AI Copilot Side Drawer / Chat Modal */}
                {copilotOpen && (
                    <div className="fixed bottom-20 right-6 w-[360px] h-[480px] bg-[#0c1424]/95 backdrop-blur-xl border border-cyan-500/40 rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
                        {/* Drawer Header */}
                        <div className="p-3.5 border-b border-cyan-500/20 bg-[#0f192d] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                                    ✨
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-white">ICU Clinical Copilot</h4>
                                    <p className="text-[10px] text-cyan-400 font-mono">Twin Sync: {activePatient.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setCopilotOpen(false)}
                                className="text-slate-400 hover:text-white p-1 text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
                            {copilotMessages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`p-2.5 rounded-2xl ${
                                        msg.role === 'assistant'
                                            ? 'bg-[#131f38] border border-cyan-500/20 text-cyan-100 rounded-tl-none'
                                            : 'bg-indigo-600 text-white ml-auto max-w-[85%] rounded-tr-none'
                                    }`}
                                >
                                    <p className="leading-relaxed text-[11px]">{msg.text}</p>
                                </div>
                            ))}
                        </div>

                        {/* Drawer Input */}
                        <div className="p-2.5 border-t border-slate-800 bg-[#0c1424]">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={copilotQuery}
                                    onChange={(e) => setCopilotQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCopilotSend()}
                                    placeholder="Ask regarding organ risk or intervention..."
                                    className="flex-1 bg-[#131f38] border border-cyan-500/30 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                                />
                                <button
                                    onClick={handleCopilotSend}
                                    className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}

// Subcomponent: Floating Diagnosis Card (Replicating reference design)
function FloatingDiagnosisCard({ organ, style, onClose }) {
    if (!organ) return null;

    const isCritical = organ.severity === 'CRITICAL';
    const badgeColor = isCritical
        ? 'bg-red-950 text-red-400 border-red-500/50'
        : organ.severity === 'WARNING'
        ? 'bg-amber-950 text-amber-300 border-amber-500/50'
        : 'bg-emerald-950 text-emerald-400 border-emerald-500/50';

    return (
        <div
            style={style}
            className="absolute bg-[#0b1324]/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-3 shadow-[0_0_30px_rgba(0,0,0,0.8)] z-30 transition-all text-slate-200"
        >
            {/* Header: Icon, Organ Title, Severity Badge, Close Button */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-cyan-500/20 text-cyan-300 text-xs">
                        ⚡
                    </span>
                    <span className="text-xs font-bold text-white">{organ.name.split(' ')[0]}</span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${badgeColor}`}>
                        {organ.severity}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white p-0.5 text-xs leading-none"
                    title="Dismiss"
                >
                    ✕
                </button>
            </div>

            {/* Diagnostic Parameters Grid */}
            <div className="py-2 space-y-1 text-[10px] font-mono border-b border-slate-800/80">
                <div className="flex justify-between">
                    <span className="text-slate-400 uppercase">PATHOLOGY</span>
                    <span className="text-white font-semibold truncate max-w-[150px]">{organ.pathology}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400 uppercase">KEY VITALS</span>
                    <span className="text-cyan-300 font-semibold truncate max-w-[150px]">{organ.keyVital}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400 uppercase">PERFUSION</span>
                    <span className="text-red-400 font-semibold truncate max-w-[150px]">{organ.perfusion}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400 uppercase">RESPONSE</span>
                    <span className="text-amber-300 truncate max-w-[150px]">{organ.drugResponse}</span>
                </div>
            </div>

            {/* Clinical Note Narrative */}
            <p className="text-[10px] text-slate-300 leading-tight py-1.5 italic">
                {organ.clinicalNote}
            </p>

            {/* Mini AI Insight Box */}
            <div className="p-1.5 rounded-lg bg-purple-950/40 border border-purple-500/30 text-[9px] text-purple-200 mt-1">
                <span className="font-bold text-purple-300 mr-1">⚡ AI INSIGHT:</span>
                {organ.aiCallout}
            </div>

            {/* Organ Reserve Progress Gauge */}
            <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">ORGAN RESERVE</span>
                <div className="flex items-center gap-2">
                    <div className="w-16 h-1 rounded-full bg-slate-800 overflow-hidden">
                        <div
                            className={`h-full rounded-full ${isCritical ? 'bg-red-500' : 'bg-emerald-400'}`}
                            style={{ width: `${organ.reserve}%` }}
                        ></div>
                    </div>
                    <span className="font-mono font-bold text-white">{organ.reserve}%</span>
                </div>
            </div>
        </div>
    );
}

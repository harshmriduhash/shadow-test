import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const apiUrl = __ENV.STAGING_API_URL;
const authToken = __ENV.STAGING_BEARER_TOKEN;
const projectId = __ENV.STAGING_PROJECT_ID;
const personaId = __ENV.STAGING_PERSONA_ID;
const task = __ENV.STAGING_TASK || 'Find the public product pricing information';
const confirmed = __ENV.CONFIRM_STAGING_LOAD_TEST === 'YES';

if (!apiUrl || !authToken || !projectId || !personaId) {
    throw new Error('Set STAGING_API_URL, STAGING_BEARER_TOKEN, STAGING_PROJECT_ID, and STAGING_PERSONA_ID.');
}
if (!confirmed) {
    throw new Error('Set CONFIRM_STAGING_LOAD_TEST=YES after confirming this is an isolated staging account and target.');
}

const parsedApiUrl = new URL(apiUrl);
if (parsedApiUrl.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsedApiUrl.hostname)) {
    throw new Error('Use HTTPS for staging load-test targets.');
}
if (parsedApiUrl.pathname.replace(/\/+$/, '') !== '/api') {
    throw new Error('STAGING_API_URL must end in /api.');
}
const host = parsedApiUrl.hostname.toLowerCase();
if (!(host.includes('staging') || host.includes('preview') || host === 'localhost' || host === '127.0.0.1')) {
    throw new Error('Refusing to run simulation load against a host not clearly marked staging/preview/local.');
}

const stepLatency = new Trend('simulation_step_interval_ms', true);
const reportLatency = new Trend('simulation_report_generation_ms', true);
const simulationFailures = new Rate('simulation_failures');
const completedSimulations = new Counter('completed_simulations');

export const options = {
    scenarios: {
        concurrent_simulations: {
            executor: 'per-vu-iterations',
            vus: 100,
            iterations: 1,
            maxDuration: '20m',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<3000'],
        http_req_failed: ['rate<0.01'],
        simulation_step_interval_ms: ['p(95)<3000'],
        simulation_report_generation_ms: ['p(95)<30000'],
        simulation_failures: ['rate<0.01'],
    },
};

const headers = {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
};

export default function () {
    const startedAt = Date.now();
    const startResponse = http.post(
        `${apiUrl.replace(/\/+$/, '')}/simulations/start`,
        JSON.stringify({ projectId, personaId, task }),
        { headers, tags: { operation: 'simulation_start' } },
    );
    if (!check(startResponse, { 'simulation accepted': response => response.status === 202 })) {
        simulationFailures.add(true);
        return;
    }

    simulationFailures.add(false);
    const simulationId = startResponse.json('id');
    if (!simulationId) {
        simulationFailures.add(true);
        fail('Simulation start response did not contain an id.');
    }

    let previousStepAt = startedAt;
    let completed = false;
    const simulationsUrl = `${apiUrl.replace(/\/+$/, '')}/projects/${encodeURIComponent(projectId)}/simulations?limit=100`;
    for (let attempt = 0; attempt < 600; attempt += 1) {
        const response = http.get(simulationsUrl, { headers, tags: { operation: 'simulation_poll' } });
        if (!check(response, { 'simulation poll succeeded': result => result.status === 200 })) {
            sleep(2);
            continue;
        }

        const simulation = response.json('items')?.find(item => item.id === simulationId);
        if (simulation?.status === 'FAILED') {
            simulationFailures.add(true);
            fail(`Simulation ${simulationId} failed.`);
        }
        if (simulation?.steps) {
            for (const step of simulation.steps) {
                const stepAt = Date.parse(step.createdAt);
                if (Number.isFinite(stepAt) && stepAt > previousStepAt) {
                    stepLatency.add(stepAt - previousStepAt);
                }
                previousStepAt = Number.isFinite(stepAt) ? stepAt : previousStepAt;
            }
        }
        if (simulation?.status === 'COMPLETED') {
            reportLatency.add(Date.now() - startedAt);
            completedSimulations.add(1);
            completed = true;
            break;
        }
        sleep(2);
    }

    if (!completed) {
        simulationFailures.add(true);
        fail(`Simulation ${simulationId} did not complete within 20 minutes.`);
    }
}

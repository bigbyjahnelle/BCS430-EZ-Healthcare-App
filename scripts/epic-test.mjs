// Epic's test server. This request retrieves server information.
const url =
    'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/metadata';

async function testEpic() {
    try {
        console.log('Connecting to Epic sandbox...');

        const response = await fetch(url, {
            headers: {
                Accept: 'application/fhir+json',
            },
            signal: AbortSignal.timeout(15000),
        });

        console.log('HTTP status:', response.status);

        if (!response.ok) {
            throw new Error(`Epic returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.resourceType !== 'CapabilityStatement') {
            throw new Error('Unexpected response from the FHIR server.');
        }

        console.log('Connection successful!');
        console.log('Resource type:', data.resourceType);
        console.log('FHIR version:', data.fhirVersion);

        console.log('\nFHIR JSON response:');
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exitCode = 1;
    }
}

testEpic();
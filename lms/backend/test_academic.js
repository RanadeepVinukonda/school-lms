require('ts-node/register');
const { listAcademicYears } = require('./src/services/academic-year.service');

async function test() {
  try {
    const res = await listAcademicYears({});
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}
test();

async function test() {
  try {
    console.log('Testing Host Dashboard API...');
    const res = await fetch('http://localhost:3000/api/host/dashboard/16');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Data:', text);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();

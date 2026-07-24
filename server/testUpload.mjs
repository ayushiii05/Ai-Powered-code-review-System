import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

// Create a dummy text file
fs.writeFileSync('dummy.js', 'console.log("hello");');

async function run() {
  try {
    // Login to get token
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test@example.com', // Assuming this exists, or we need to register
      password: 'password123'
    }).catch(async (err) => {
      // Register if login fails
      return await axios.post('http://localhost:5000/api/auth/register', {
        name: 'Test',
        email: 'test2@example.com',
        password: 'password123'
      });
    });

    const token = loginRes.data.token;

    const form = new FormData();
    form.append('file', fs.createReadStream('dummy.js'));

    const uploadRes = await axios.post('http://localhost:5000/api/project/upload/file', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Upload Success:', uploadRes.data);
  } catch (err) {
    console.error('Upload Error:', err.response ? err.response.data : err.message);
  }
}

run();

const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, 'uploads');
const testFile = path.join(uploadDir, 'test.txt');

try {
  fs.writeFileSync(testFile, 'Hello World');
  console.log('Successfully wrote to uploads directory');
  fs.unlinkSync(testFile);
  console.log('Successfully deleted test file');
} catch (error) {
  console.error('Error writing to uploads directory:', error);
}

import fetch from 'node-fetch';

const empId = '24f0c0dd-44ab-4de1-adad-9cf5e610c78e'; // from screenshot

const testUpdate = async () => {
  try {
    // This requires auth token, which we don't have. 
    // We can't do this easily without logging in.
    console.log("Need auth token to test API.");
  } catch (e) {
    console.error(e);
  }
}

testUpdate();

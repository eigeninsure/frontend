export async function uploadJsonToPinata(jsonData: any): Promise<string> {
    try {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI0ZWM1OGNlZi1kNjkyLTQxYmQtOTQwNi03MTAyYzFmNzlhODkiLCJlbWFpbCI6ImJ3aWxsaWFtd2FuZ0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMDU4ODg2OTE1MmNmNmQyNWZjZmMiLCJzY29wZWRLZXlTZWNyZXQiOiI1Y2JiMTNmZDliZGFhOTg2OTc3MTVjN2Q2NjU5ZWVlYTNhN2M4MGJiNWY1ZDQwZGY4YWMyNTRmNDM1NWNkNjcwIiwiZXhwIjoxNzcxMTc5NjM3fQ.nOfkaD5YbuMH5nqVSS8IXdpQ9myhOGs-2xvCehd8ZsI';

      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify(jsonData)
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const result = await response.json();
      return result.IpfsHash;
    } catch (error) {
      console.error('Error uploading JSON to Pinata:', error);
      throw error;
    }
  }
  
  
 
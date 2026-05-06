async function testFetch() {
  try {
    console.log("Fetching attributes from API...");
    const res = await fetch('http://localhost:3001/api/admin/attributes');
    
    console.log("Status:", res.status);
    if (!res.ok) {
      console.log("Error text:", await res.text());
      return;
    }
    const data = await res.json();
    console.log("Data:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}
testFetch();

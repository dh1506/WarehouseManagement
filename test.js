const testApi = async () => {
    try {
        const res = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'abcxyz',
                password: 'password123',
                full_name: 'ABC XYZ',
                email: 'abc@xyz.com'
            })
        });
        const data = await res.json();
        console.log("REGISTER DATA:", data);

        const res2 = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'abcxyz',
                password: 'password123'
            })
        });
        const data2 = await res2.json();
        console.log("LOGIN DATA:", data2);
    } catch(err) {
        console.error(err);
    }
}
testApi();

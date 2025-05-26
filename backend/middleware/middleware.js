module.exports = (req, res, next) => {
    // Get the base URL from environment variables
    const baseUrl = process.env.VITE_API_URL || 'http://localhost:3001';
    
    // Get the response body
    const body = JSON.stringify(res.locals.data);
    
    // Replace all image paths that start with /assets/
    const transformedBody = body.replace(/\/assets\/(.*)/g, (match, p1) => {
        return `${baseUrl}/assets/${p1}`;
    });
    
    // Replace any remaining {BASE_URL} or {import.meta.env.BASE_URL} placeholders
    const finalBody = transformedBody
        .replace(/\{BASE_URL\}/g, baseUrl)
        .replace(/\{import\.meta\.env\.BASE_URL\}/g, baseUrl);
    
    // Send the transformed response
    res.json(JSON.parse(finalBody));
    next();
};
# DeepSpace Hello Widget

A simple demo widget that calls an external API. The user enters their name and the app posts it to `https://deepspace-backend-basics.vercel.app/api/hello`, then displays the greeting response.

## Features
- Text input for a name
- Button to trigger the API call (also triggered by Enter key)
- Displays the success message from the API response
- Shows an error state if the request fails
- Loading state while the request is in-flight

## UI Structure
- **Home page**: Single centered card with input, button, and result/error display

// Character image loader - loads canvas images using direct URLs
export const loadCharacterImage = (imageUrl) => {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve(null);
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('Canvas character image loaded successfully');
      resolve(img);
    };
    
    img.onerror = (e) => {
      console.error('Failed to load canvas character image:', e);
      resolve(null);
    };
    
    img.src = imageUrl;
  });
};

// Load all character images
export const loadAllCharacterImages = async (characters) => {
  const imagePromises = characters.map(char => 
    loadCharacterImage(char.imageUrl).then(img => ({ id: char.id, image: img }))
  );
  
  const results = await Promise.all(imagePromises);
  const imageMap = {};
  results.forEach(result => {
    if (result.image) {
      imageMap[result.id] = result.image;
    }
  });
  
  return imageMap;
};

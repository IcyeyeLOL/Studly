// Asset loader with fallback support

export class AssetLoader {
  constructor() {
    this.images = new Map();
    this.loadedCount = 0;
    this.totalCount = 0;
    this.onProgress = null;
  }

  async loadImage(urls, fallbackColor = '#666666') {
    return new Promise((resolve) => {
      const tryLoad = (index) => {
        if (!urls[index]) {
          // All URLs failed or no more URLs, use fallback
          resolve({ type: 'fallback', color: fallbackColor });
          this.loadedCount++;
          if (this.onProgress) this.onProgress(this.loadedCount, this.totalCount);
          return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        const timeout = setTimeout(() => {
          img.src = ''; // Cancel load
          tryLoad(index + 1);
        }, 5000);

        img.onload = () => {
          clearTimeout(timeout);
          resolve({ type: 'image', img });
          this.loadedCount++;
          if (this.onProgress) this.onProgress(this.loadedCount, this.totalCount);
        };

        img.onerror = () => {
          clearTimeout(timeout);
          tryLoad(index + 1);
        };

        img.src = urls[index];
      };

      tryLoad(0);
    });
  }

  async loadCharacterSprites(characters) {
    const results = new Map();
    
    for (const char of characters) {
      const sprites = {};
      const spritePromises = [];
      
      for (const [state, urls] of Object.entries(char.sprites)) {
        spritePromises.push(
          this.loadImage(urls, char.color).then(asset => {
            sprites[state] = asset;
          })
        );
        this.totalCount++;
      }
      
      await Promise.all(spritePromises);
      results.set(char.id, sprites);
    }
    
    return results;
  }

  async loadMapBackgrounds(maps) {
    const results = new Map();
    
    for (const map of maps) {
      this.totalCount++;
      const asset = await this.loadImage(map.backgrounds, null);
      results.set(map.id, {
        asset,
        gradient: map.gradient
      });
    }
    
    return results;
  }

  async loadAllAssets(characters, maps) {
    this.loadedCount = 0;
    this.totalCount = 0;
    
    const [characterSprites, mapBackgrounds] = await Promise.all([
      this.loadCharacterSprites(characters),
      this.loadMapBackgrounds(maps)
    ]);
    
    return {
      characters: characterSprites,
      maps: mapBackgrounds
    };
  }
}

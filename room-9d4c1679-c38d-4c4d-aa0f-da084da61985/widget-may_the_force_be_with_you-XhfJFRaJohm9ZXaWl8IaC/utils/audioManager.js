export class AudioManager {
  constructor() {
    this.context = null;
    this.bgMusicNode = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.initialized = false;
    this.muted = false;
    this.bgAudio = null; // HTML5 Audio for Star Wars theme
    this.bgMusicSource = null; // MediaElementSource for Web Audio connection
  }

  async initialize() {
    if (this.initialized) return;

    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();

      // Create gain nodes
      this.masterGain = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);

      this.musicGain.gain.value = 0.5; // Increased volume
      this.sfxGain.gain.value = 0.3;

      this.initialized = true;
      console.log('Audio context initialized successfully');
    } catch (error) {
      console.warn('Audio initialization failed:', error);
    }
  }

  startBackgroundMusic() {
    if (!this.initialized) {
      console.warn('Audio not initialized');
      return;
    }

    if (this.bgAudio) {
      console.log('Music already playing');
      return;
    }

    try {
      // Resume audio context if suspended (browser autoplay policy)
      if (this.context.state === 'suspended') {
        this.context.resume().then(() => {
          console.log('Audio context resumed');
          this.playStarWarsTheme();
        });
      } else {
        this.playStarWarsTheme();
      }
    } catch (error) {
      console.warn('Background music failed:', error);
    }
  }

  playStarWarsTheme() {
    try {
      // Create HTML5 Audio element
      this.bgAudio = new Audio();
      
      // Intense sci-fi battle music URLs (verified working - 2022-2023 tracks)
      const urls = [
        // "Dark Matter Canon" - Dark Synthwave Cyberpunk (CONFIRMED WORKING)
        'https://cdn.pixabay.com/audio/2022/10/10/audio_24ee25c9ad.mp3',
        // Epic Hollywood Trailer - Intense Battle with Choir
        'https://cdn.pixabay.com/audio/2022/03/10/audio_4a1fdd0d27.mp3',
        // Powerful Cinematic Orchestra - Heart Racing
        'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
        // Dramatic Action Epic
        'https://cdn.pixabay.com/audio/2022/03/24/audio_c93d4c607f.mp3',
        // Adventure Battle Theme
        'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3'
      ];
      
      let currentUrlIndex = 0;
      
      const tryNextUrl = () => {
        if (currentUrlIndex >= urls.length) {
          console.warn('All music URLs failed, using synthesized music');
          this.bgAudio = null;
          this.startSynthesizedMusic();
          return;
        }
        
        console.log(`Trying music URL ${currentUrlIndex + 1}/${urls.length}`);
        this.bgAudio.src = urls[currentUrlIndex];
        currentUrlIndex++;
        
        this.bgAudio.load();
        
        const playPromise = this.bgAudio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Star Wars theme playing successfully!');
            })
            .catch(error => {
              console.warn(`Music URL ${currentUrlIndex} failed:`, error);
              tryNextUrl();
            });
        }
      };
      
      this.bgAudio.loop = false; // Don't loop - play once only
      this.bgAudio.volume = 0.6;
      this.bgAudio.crossOrigin = 'anonymous';
      
      // Stop after 4 seconds
      const timeUpdateHandler = () => {
        if (this.bgAudio && this.bgAudio.currentTime >= 4) {
          this.bgAudio.pause();
          this.bgAudio.removeEventListener('timeupdate', timeUpdateHandler);
          console.log('Music stopped after 4 seconds');
        }
      };
      this.bgAudio.addEventListener('timeupdate', timeUpdateHandler);
      
      // Error handler
      this.bgAudio.addEventListener('error', (e) => {
        console.warn('Audio error:', e);
        tryNextUrl();
      });
      
      // Success handler
      this.bgAudio.addEventListener('canplaythrough', () => {
        console.log('Audio loaded and ready to play');
      });
      
      // Connect to Web Audio API (only once)
      if (this.context && !this.bgMusicSource) {
        try {
          this.bgMusicSource = this.context.createMediaElementSource(this.bgAudio);
          this.bgMusicSource.connect(this.musicGain);
          console.log('Audio connected to Web Audio API');
        } catch (e) {
          console.warn('Could not connect to Web Audio API:', e);
          // Continue anyway - audio will play through default output
        }
      }
      
      // Start trying URLs
      tryNextUrl();
      
      this.bgMusicNode = this.bgAudio;
      
    } catch (error) {
      console.warn('Failed to create Star Wars theme:', error);
      this.startSynthesizedMusic();
    }
  }

  // Fallback synthesized music (original code)
  startSynthesizedMusic() {
    if (!this.initialized || this.bgMusicNode) return;

    console.log('Starting synthesized fallback music');

    try {
      const oscillator1 = this.context.createOscillator();
      const oscillator2 = this.context.createOscillator();
      const lfo = this.context.createOscillator();
      const lfoGain = this.context.createGain();

      oscillator1.type = 'sine';
      oscillator2.type = 'sine';
      lfo.type = 'sine';

      oscillator1.frequency.value = 220; // A3
      oscillator2.frequency.value = 330; // E4
      lfo.frequency.value = 0.5; // Slow modulation
      lfoGain.gain.value = 10;

      lfo.connect(lfoGain);
      lfoGain.connect(oscillator1.frequency);
      lfoGain.connect(oscillator2.frequency);

      const gain1 = this.context.createGain();
      const gain2 = this.context.createGain();
      gain1.gain.value = 0.05;
      gain2.gain.value = 0.03;

      oscillator1.connect(gain1);
      oscillator2.connect(gain2);
      gain1.connect(this.musicGain);
      gain2.connect(this.musicGain);

      oscillator1.start();
      oscillator2.start();
      lfo.start();

      this.bgMusicNode = { oscillator1, oscillator2, lfo };
      console.log('Synthesized music started');
    } catch (error) {
      console.warn('Synthesized background music failed:', error);
    }
  }

  stopBackgroundMusic() {
    if (!this.bgMusicNode) return;

    console.log('Stopping background music');

    try {
      // Stop HTML5 Audio (Star Wars theme)
      if (this.bgAudio) {
        this.bgAudio.pause();
        this.bgAudio.currentTime = 0;
        this.bgAudio.src = ''; // Clear source
        this.bgAudio = null;
      }
      
      // Stop synthesized music (fallback)
      if (this.bgMusicNode.oscillator1) {
        this.bgMusicNode.oscillator1.stop();
        this.bgMusicNode.oscillator2.stop();
        this.bgMusicNode.lfo.stop();
      }
      
      this.bgMusicNode = null;
      
      // Don't disconnect bgMusicSource - it can only be created once per audio element
    } catch (error) {
      console.warn('Stop music failed:', error);
    }
  }

  playSFX(config) {
    if (!this.initialized || this.muted) return;

    try {
      if (config.frequencies) {
        // Multi-tone sound (like KO)
        config.frequencies.forEach((freq, index) => {
          setTimeout(() => {
            this.playTone(freq, config.duration / config.frequencies.length, config.type);
          }, index * (config.duration * 1000 / config.frequencies.length));
        });
      } else {
        this.playTone(config.frequency, config.duration, config.type);
      }
    } catch (error) {
      console.warn('SFX playback failed:', error);
    }
  }

  playTone(frequency, duration, type = 'sine') {
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.sfxGain);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    const now = this.context.currentTime;
    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  setMusicVolume(volume) {
    if (this.musicGain) {
      this.musicGain.gain.value = volume;
    }
    if (this.bgAudio) {
      this.bgAudio.volume = volume;
    }
  }

  setSFXVolume(volume) {
    if (this.sfxGain) {
      this.sfxGain.gain.value = volume;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1;
    }
    console.log('Muted:', muted);
  }

  getMuted() {
    return this.muted;
  }
}
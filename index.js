    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let ctx;
    let masterGain;
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let currentMode = 'piano';

    function initAudio() {
        if (!ctx) {
            ctx = new AudioContext();
            masterGain = ctx.createGain();
            masterGain.gain.value = 0.4;
            masterGain.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume();
    }

    function playTone(freq, type) {
        initAudio();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(masterGain);

        if (currentMode === 'piano') {
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(1, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
            osc.start(t);
            osc.stop(t + 1.5);
        } 
        else if (currentMode === 'synth') {
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, t);
            filter.frequency.linearRampToValueAtTime(2000, t + 0.1);
            
            osc.disconnect();
            osc.connect(filter);
            filter.connect(gain);

            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
            osc.start(t);
            osc.stop(t + 0.8);
        }
        else if (currentMode === 'drums') {
        }
    }

    function playDrum(type) {
        initAudio();
        const t = ctx.currentTime;
        
        if (type === 'kick') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
            gain.gain.setValueAtTime(1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start();
            osc.stop(t + 0.5);
        } else if (type === 'snare') {
            const bufferSize = ctx.sampleRate * 0.2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 1000;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.8, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            noise.start();
        } else if (type === 'hihat') {
            const bufferSize = ctx.sampleRate * 0.1;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 5000;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            noise.start();
        }
    }
    function generateNotes() {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const keys = [];
        let keyMap = 'awsedftgyhujkolp;[\\]';
        
        let baseFreq = 130.81; 
        
        for (let octave = 0; octave < 2; octave++) {
            notes.forEach((note, index) => {
                const isBlack = note.includes('#');
                const freq = baseFreq * Math.pow(2, (octave * 12 + index) / 12);
                const keyChar = keyMap[(octave * 12) + index] || '';
                
                keys.push({
                    note: note,
                    freq: freq,
                    key: keyChar,
                    type: isBlack ? 'black' : 'white',
                    octave: octave + 3
                });
            });
        }
        keys.push({ note: 'C', freq: baseFreq * 4, key: '', type: 'white', octave: 5 });
        
        return keys;
    }

    const allKeys = generateNotes();
    const keyboardEl = document.getElementById('keyboard');

    function renderKeyboard() {
        keyboardEl.innerHTML = '';
        
        if (currentMode === 'drums') {
            const drums = [
                { name: 'Kick', key: 'a', type: 'kick' },
                { name: 'Snare', key: 's', type: 'snare' },
                { name: 'HiHat', key: 'd', type: 'hihat' },
                { name: 'Kick', key: 'f', type: 'kick' },
                { name: 'Snare', key: 'g', type: 'snare' },
                { name: 'HiHat', key: 'h', type: 'hihat' },
                { name: 'Kick', key: 'j', type: 'kick' },
                { name: 'Snare', key: 'k', type: 'snare' },
            ];

            drums.forEach(d => {
                const el = document.createElement('div');
                el.className = 'key white';
                el.style.width = '80px';
                el.innerHTML = `<span class="key-label">${d.name}<br><small>${d.key.toUpperCase()}</small></span>`;
                el.dataset.key = d.key;
                el.dataset.type = d.type;
                el.onmousedown = () => {
                    playDrum(d.type);
                    animateKey(el);
                };
                keyboardEl.appendChild(el);
            });
        } else {
            let whiteKeyIndex = 0;
            
            allKeys.forEach(k => {
                const el = document.createElement('div');
                el.className = `key ${k.type}`;
                el.dataset.key = k.key;
                el.dataset.freq = k.freq;

                if (k.type === 'white') {
                    el.innerHTML = `<span class="key-label">${k.key.toUpperCase()}</span>`;
                    el.onmousedown = () => {
                        playTone(k.freq);
                        animateKey(el);
                    };
                    keyboardEl.appendChild(el);
                    whiteKeyIndex++;
                } else {
                    const leftPos = (whiteKeyIndex * 54) - 18; 
                    el.style.left = `${leftPos}px`;
                    el.onmousedown = () => {
                        playTone(k.freq);
                        animateKey(el);
                    };
                    keyboardEl.appendChild(el);
                }
            });
        }
    }

    function animateKey(el) {
        el.classList.add('active');
        setTimeout(() => el.classList.remove('active'), 150);
    }

    function setMode(mode) {
        currentMode = mode;
        document.querySelectorAll('.selector button').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
        renderKeyboard();
    }

    window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        initAudio();

        if (currentMode === 'drums') {
            const d = Array.from(document.querySelectorAll('.key')).find(k => k.dataset.key === e.key);
            if (d) {
                playDrum(d.dataset.type);
                animateKey(d);
            }
        } else {
            const k = Array.from(document.querySelectorAll('.key')).find(k => k.dataset.key === e.key);
            if (k) {
                playTone(parseFloat(k.dataset.freq));
                animateKey(k);
            }
        }
    });


    function toggleRecord() {
        initAudio();
        const btn = document.getElementById('recBtn');
        const status = document.getElementById('status');

        if (!isRecording) {
            const dest = ctx.createMediaStreamDestination();
            masterGain.connect(dest);
            
            mediaRecorder = new MediaRecorder(dest.stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `minimal-studio-${Date.now()}.webm`;
                a.click();
                status.innerText = "Downloaded";
                setTimeout(() => status.innerText = "Ready", 2000);
            };

            mediaRecorder.start();
            isRecording = true;
            btn.classList.add('recording');
            status.innerText = "Recording...";
        } else {
            mediaRecorder.stop();
            isRecording = false;
            btn.classList.remove('recording');
            status.innerText = "Processing...";
        }
    }

    renderKeyboard();
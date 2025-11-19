import * as Tone from 'tone';

// --- Music Theory Database ---
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CHORD_TYPES = {
	'maj':   { label: 'Major', intervals: [0, 4, 7] },
	'min':   { label: 'Minor', intervals: [0, 3, 7] },
	'maj7':  { label: 'Maj 7', intervals: [0, 4, 7, 11] },
	'min7':  { label: 'Min 7', intervals: [0, 3, 7, 10] },
	'dom7':  { label: 'Dom 7', intervals: [0, 4, 7, 10] },
	'dim':   { label: 'Dim',   intervals: [0, 3, 6] },
	'dim7':  { label: 'Dim 7', intervals: [0, 3, 6, 9] },
	'aug':   { label: 'Aug',   intervals: [0, 4, 8] },
	'sus4':  { label: 'Sus4',  intervals: [0, 5, 7] }
};

// --- App State ---
let chordSequence = [
	{ root: 'C', type: 'maj7' },
	{ root: 'A', type: 'min7' },
	{ root: 'D', type: 'min7' },
	{ root: 'G', type: 'dom7' }
];
let isPlaying = false;
let currentStep = 0; // kept for potential future use

// --- Audio Setup (Tone.js) ---
// 1. PolySynth for Chords (Pads)
const chordSynth = new Tone.PolySynth(Tone.Synth, {
	oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
	envelope: { attack: 0.2, decay: 0.1, sustain: 0.5, release: 1 }
}).toDestination();
chordSynth.volume.value = -12;

// 2. Membrane for Bass
const bassSynth = new Tone.MembraneSynth().toDestination();
bassSynth.volume.value = -6;

// 3. Lead Synth for Melody
const leadSynth = new Tone.PolySynth(Tone.FMSynth, {
	harmonicity: 3,
	modulationIndex: 10,
	oscillator: { type: 'sine' },
	envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 },
	modulation: { type: 'square' },
	modulationEnvelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
}).toDestination();
leadSynth.volume.value = -10;

// Effects
const reverb = new Tone.Reverb({ decay: 4, wet: 0.3 }).toDestination();
chordSynth.connect(reverb);
leadSynth.connect(reverb);

// --- UI Generator ---
const grid = document.getElementById('chordGrid');
const addBtn = document.getElementById('addChordBtn');

function renderGrid() {
	// Clear existing cards (keep the add button)
	const cards = grid.querySelectorAll('.chord-card');
	cards.forEach(c => c.remove());

	chordSequence.forEach((chordData, index) => {
		const card = document.createElement('div');
		card.className = 'chord-card';
		card.dataset.index = index;

		// Remove Button
		const rmBtn = document.createElement('button');
		rmBtn.className = 'remove-btn';
		rmBtn.innerHTML = '✕';
		rmBtn.onclick = () => {
			chordSequence.splice(index, 1);
			renderGrid();
		};
		card.appendChild(rmBtn);

		// Root Selector
		const rootSel = document.createElement('select');
		NOTES.forEach(note => {
			const opt = document.createElement('option');
			opt.value = note;
			opt.innerText = note;
			if (note === chordData.root) opt.selected = true;
			rootSel.appendChild(opt);
		});
		rootSel.onchange = (e) => chordSequence[index].root = e.target.value;
		card.appendChild(rootSel);

		// Type Selector
		const typeSel = document.createElement('select');
		for (const [key, val] of Object.entries(CHORD_TYPES)) {
			const opt = document.createElement('option');
			opt.value = key;
			opt.innerText = val.label;
			if (key === chordData.type) opt.selected = true;
			typeSel.appendChild(opt);
		}
		typeSel.onchange = (e) => chordSequence[index].type = e.target.value;
		card.appendChild(typeSel);

		grid.insertBefore(card, addBtn);
	});
}

addBtn.addEventListener('click', () => {
	chordSequence.push({ root: 'C', type: 'maj' });
	renderGrid();
});

document.getElementById('clearBtn').addEventListener('click', () => {
	chordSequence = [];
	renderGrid();
});

// --- Music Theory Logic ---
function getFrequencies(root, type) {
	const rootIdx = NOTES.indexOf(root);
	const intervals = CHORD_TYPES[type].intervals;

	return intervals.map(interval => {
		let noteIdx = rootIdx + interval;
		let octave = 4;
		if (noteIdx >= 12) {
			noteIdx -= 12;
			octave = 5;
		}
		if (noteIdx >= 24) { // Handle extended chords if needed
			noteIdx -= 12;
			octave = 6;
		}
		return NOTES[noteIdx] + octave;
	});
}

// --- Sequencer Logic ---
function startSequencer() {
	let stepCounter = 0;

	// Loop every Measure (1m)
	Tone.Transport.scheduleRepeat((time) => {
		if (chordSequence.length === 0) return;

		const currentChordIndex = stepCounter % chordSequence.length;
		const chordData = chordSequence[currentChordIndex];

		// 1. Visual Feedback
		Tone.Draw.schedule(() => {
			document.querySelectorAll('.chord-card').forEach(c => c.classList.remove('active'));
			const activeCard = document.querySelector(`.chord-card[data-index="${currentChordIndex}"]`);
			if (activeCard) activeCard.classList.add('active');
		}, time);

		// 2. Calculate Notes
		const notes = getFrequencies(chordData.root, chordData.type);
		const rootFreq = notes[0].replace('4', '3'); // Drop root an octave

		// 3. Play Bass (Beat 1)
		bassSynth.triggerAttackRelease(rootFreq, '2n', time);
		if (Math.random() > 0.6) {
			// Optional bass syncopation on off-beat
			bassSynth.triggerAttackRelease(rootFreq, '8n', time + Tone.Time('4n.'));
		}

		// 4. Play Chord Pad
		chordSynth.triggerAttackRelease(notes, '1m', time);

		// 5. Procedural Melody (Arpeggiator based on chord tones)
		// Divide measure into 16th notes
		const sixteenth = Tone.Time('16n').toSeconds();

		for (let i = 0; i < 16; i++) {
			// Random chance to play a note
			if (Math.random() > 0.4) {
				// Pick a note strictly from the chord notes (safe notes)
				// This ensures "Jazz" chords sound jazzy because we play the 7th/9th
				let note = notes[Math.floor(Math.random() * notes.length)];

				// Randomize octave for range
				if (Math.random() > 0.7) note = note.replace('4', '5');

				// Add a little timing swing
				let playTime = time + (i * sixteenth);
				leadSynth.triggerAttackRelease(note, '16n', playTime);
			}
		}

		stepCounter++;
	}, '1m');

	Tone.Transport.start();
}

// --- Presets & Substitutions ---
const presets = {
	pop: [
		{ root: 'C', type: 'maj' }, { root: 'G', type: 'maj' }, { root: 'A', type: 'min' }, { root: 'F', type: 'maj' }
	],
	jazz: [
		{ root: 'D', type: 'min7' }, { root: 'G', type: 'dom7' }, { root: 'C', type: 'maj7' }, { root: 'A', type: 'dom7' }
	],
	neosoul: [
		{ root: 'F', type: 'maj7' }, { root: 'E', type: 'min7' }, { root: 'D', type: 'min7' }, { root: 'D', type: 'min7' },
		{ root: 'G', type: 'dom7' }, { root: 'C', type: 'maj7' }
	],
	creepy: [
		{ root: 'C', type: 'min' }, { root: 'D', type: 'dim' }, { root: 'G', type: 'dim7' }, { root: 'C', type: 'min' }
	],
	emotional: [
		{ root: 'C', type: 'maj' }, { root: 'E', type: 'maj' }, { root: 'F', type: 'maj7' }, { root: 'F', type: 'min' }
	]
};

document.getElementById('applyPresetBtn').addEventListener('click', () => {
	const val = document.getElementById('presetSelect').value;
	if (val && presets[val]) {
		// Deep copy to avoid reference issues
		chordSequence = JSON.parse(JSON.stringify(presets[val]));
		renderGrid();
	}
});

// --- Controls ---
document.getElementById('playBtn').addEventListener('click', async () => {
	await Tone.start();
	if (isPlaying) return;

	isPlaying = true;
	document.getElementById('playBtn').style.display = 'none';
	document.getElementById('stopBtn').style.display = 'inline-block';
	startSequencer();
});

document.getElementById('stopBtn').addEventListener('click', () => {
	Tone.Transport.stop();
	Tone.Transport.cancel();
	isPlaying = false;
	document.getElementById('playBtn').style.display = 'inline-block';
	document.getElementById('stopBtn').style.display = 'none';
	document.querySelectorAll('.chord-card').forEach(c => c.classList.remove('active'));
});

document.getElementById('bpmSlider').addEventListener('input', (e) => {
	Tone.Transport.bpm.value = e.target.value;
	document.getElementById('bpmDisplay').innerText = e.target.value;
});

// --- Init ---
renderGrid();

// Simple Visualizer bars
const vizContainer = document.getElementById('viz');
for (let i = 0; i < 40; i++) {
	let b = document.createElement('div');
	b.className = 'bar';
	vizContainer.appendChild(b);
}

function animateViz() {
	requestAnimationFrame(animateViz);
	if (!isPlaying) return;

	const bars = document.querySelectorAll('.bar');
	bars.forEach((b) => {
		if (Math.random() > 0.5) {
			b.style.height = Math.random() * 100 + '%';
		} else {
			b.style.height = '10%';
		}
	});
}
animateViz();

export {};
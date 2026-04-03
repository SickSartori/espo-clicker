let playlist = [];
let currentTrackIndex = 0;
let isPlaying = false;
let audio = new Audio();

// FIX: Variabili di stato per Loop e Random
let isRandom = false;
let isLooping = false;

// FIX: Lista nera dei temi speciali/eventi che non vogliamo nella playlist principale
const excludedMusicIDs = [
    'sound-bluescreen', // 404
    'sound-matrix',     // Matrix
    'sound-fury-music', // Fury
    'sound-fury-theme', 
    'sound-star'        // Super Star
];

// FIX: Aggiorna graficamente il colore di riempimento della progress bar
window.updateSliderVisuals = function(sliderId) {
    const slider = document.getElementById(sliderId);
    if(slider) {
        const val = slider.value;
        slider.style.background = `linear-gradient(to right, #007bff ${val}%, #4d4d4d ${val}%)`;
    }
};

async function initPlayer() {
    audio.volume = document.getElementById('volume-slider').value / 100;
    updateSliderVisuals('volume-slider');
    
    try {
        // FIX: Carica unicamente i file locali inseriti nella cartella songs/
        const response = await fetch('get_songs.php');
        if (response.ok) {
            const autoSongs = await response.json();
            playlist = playlist.concat(autoSongs);
        }

        // FIX: Mantenuto il caricamento per eventuali link web esterni da config
        if (window.espofyConfig && window.espofyConfig.externalMusics) {
            const custom = window.espofyConfig.externalMusics;
            for (const key in custom) {
                playlist.push({
                    name: custom[key].name,
                    file: custom[key].src,
                    source: 'Web'
                });
            }
        }
    } catch (error) {
        console.error("Errore nel caricamento della playlist:", error);
    }

    renderPlaylist();

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => {
    // Forza il caricamento del nuovo brano
    nextTrack();
    // Su mobile a volte serve chiamare play() esplicitamente dopo un interazione utente
    });

    audio.addEventListener('loadedmetadata', () => {
        document.getElementById('time-total').textContent = formatTime(audio.duration);
    });

    // FIX: Previene l'avvio e l'errore NotSupportedError se la cartella è vuota
    if (playlist.length > 0) {
        loadTrack(0, false);
    }
}

function renderPlaylist() {
    const tbody = document.getElementById('playlist-body');
    tbody.innerHTML = '';
    
    playlist.forEach((track, index) => {
        const tr = document.createElement('tr');
        tr.onclick = () => loadAndPlayTrack(index);
        
        const timeCellId = `time-cell-${index}`;
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td class="track-title">${track.name}</td>
            <td id="${timeCellId}">--:--</td>
        `;
        tbody.appendChild(tr);

        if (!track.durationFormatted) {
            const tempAudio = new Audio(track.file);
            tempAudio.addEventListener('loadedmetadata', () => {
                track.durationFormatted = formatTime(tempAudio.duration);
                const cell = document.getElementById(timeCellId);
                if (cell) cell.textContent = track.durationFormatted;
            });
        } else {
            document.getElementById(timeCellId).textContent = track.durationFormatted;
        }
    });
}

function loadTrack(index, autoPlay = true) {
    currentTrackIndex = index;
    audio.src = playlist[index].file;
    document.getElementById('current-track-name').textContent = playlist[index].name;

    // --- AGGIUNTA PER CONTROLLI BACKGROUND ---
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: playlist[index].name,
            artist: 'Espofy',
            album: 'Espòòò Clicker OST',
            artwork: [{ src: 'ico.svg', sizes: '512x512', type: 'image/svg+xml' }]
        });

        // Configura le azioni dello skip
        navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
        navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
    }
    // ------------------------------------------

    updatePlaylistUI();
    if(autoPlay) playTrack();
}

function loadAndPlayTrack(index) {
    loadTrack(index, true);
}

function playPauseTrack() {
    if (playlist.length === 0) return;
    isPlaying ? pauseTrack() : playTrack();
}

function playTrack() {
    let playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.then(_ => {
            isPlaying = true;
            document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>';
        }).catch(error => {
            console.warn("Impossibile riprodurre la traccia:", error);
            isPlaying = false;
        });
    }
}

function pauseTrack() {
    audio.pause();
    isPlaying = false;
    document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
}

function nextTrack() {
    if (playlist.length === 0) return;
    
    let nextIndex;
    if (isRandom) {
        nextIndex = Math.floor(Math.random() * playlist.length);
        // Evita che ripeschi la stessa identica canzone (se possibile)
        if (nextIndex === currentTrackIndex && playlist.length > 1) {
            nextIndex = (nextIndex + 1) % playlist.length;
        }
    } else {
        nextIndex = (currentTrackIndex + 1) % playlist.length;
    }
    loadAndPlayTrack(nextIndex);
}

function prevTrack() {
    if (playlist.length === 0) return;
    let prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    loadAndPlayTrack(prevIndex);
}

// FIX: Funzioni Random e Loop
function toggleRandom() {
    isRandom = !isRandom;
    document.getElementById('random-btn').style.color = isRandom ? '#007bff' : '#b3b3b3';
}

function toggleLoop() {
    isLooping = !isLooping;
    document.getElementById('loop-btn').style.color = isLooping ? '#007bff' : '#b3b3b3';
    audio.loop = isLooping;
}

function updateProgress() {
    if (audio.duration) {
        const progressEl = document.getElementById('track-progress');
        progressEl.value = (audio.currentTime / audio.duration) * 100;
        document.getElementById('time-current').textContent = formatTime(audio.currentTime);
        updateSliderVisuals('track-progress');
    }
}

function seekTrack() {
    const progressEl = document.getElementById('track-progress');
    const seekTime = (progressEl.value / 100) * audio.duration;
    audio.currentTime = seekTime;
}

function changeVolume() {
    const volumeEl = document.getElementById('volume-slider');
    audio.volume = volumeEl.value / 100;
    updateSliderVisuals('volume-slider');
}

function updatePlaylistUI() {
    const rows = document.querySelectorAll('#playlist-body tr');
    rows.forEach((row, index) => {
        row.classList.remove('playing');
        if (index === currentTrackIndex) {
            row.classList.add('playing');
        }
    });
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

window.addEventListener('DOMContentLoaded', initPlayer);
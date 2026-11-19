const audioElement = document.getElementById('audioElement');
const audioFileInput = document.getElementById('audioFileInput');
const songListEl = document.getElementById('songList');
const playlistListEl = document.getElementById('playlistList');
const detailSongListEl = document.getElementById('detailSongList');
const playerBar = document.getElementById('playerBar');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');

let songs = JSON.parse(localStorage.getItem('runbeat_songs')) || [];
let playlists = JSON.parse(localStorage.getItem('runbeat_playlists')) || [];
let currentQueue = [];
let currentIndex = 0;
let activePlaylistId = null;

// 서비스 워커 등록
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

// 탭 전환 함수
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  
  if (tabName === 'library') {
    document.getElementById('libraryTab').classList.add('active');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.getElementById('playlistDetailTab').style.display = 'none';
  } else if (tabName === 'playlists') {
    document.getElementById('playlistsTab').classList.add('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
    document.getElementById('playlistDetailTab').style.display = 'none';
    renderPlaylists();
  }
}

// 파일 업로드 처리
audioFileInput.addEventListener('change', (e) => {
  const files = e.target.files;
  for (let file of files) {
    const songURL = URL.createObjectURL(file);
    const newSong = {
      id: 'song_' + Date.now() + Math.random(),
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local Storage",
      url: songURL
    };
    songs.push(newSong);
  }
  saveData();
  renderSongList();
});

function saveData() {
  localStorage.setItem('runbeat_songs', JSON.stringify(songs));
  localStorage.setItem('runbeat_playlists', JSON.stringify(playlists));
}

// 전체 곡 목록 렌더링
function renderSongList() {
  songListEl.innerHTML = '';
  if (songs.length === 0) {
    songListEl.innerHTML = '<p style="opacity: 0.6; font-size: 14px;">상단 파일 선택 버튼을 눌러 러닝 음악을 추가하세요.</p>';
    return;
  }
  
  songs.forEach((song, index) => {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.innerHTML = `
      <div style="font-size: 22px;">🎵</div>
      <div class="song-info" onclick="playQueue(${index}, songs)">
        <div class="song-title">${song.title}</div>
        <div class="song-artist">${song.artist}</div>
      </div>
      <button onclick="openAddToPlaylistModal('${song.id}')" style="font-size: 16px; opacity: 0.7;" title="플레이리스트에 추가">➕</button>
    `;
    songListEl.appendChild(card);
  });
}

// 플레이리스트 생성 버튼 이벤트
document.getElementById('createPlaylistBtn').addEventListener('click', () => {
  const input = document.getElementById('playlistNameInput');
  const name = input.value.trim();
  if (!name) return;

  const newPlaylist = {
    id: 'pl_' + Date.now(),
    name: name,
    songIds: []
  };
  playlists.push(newPlaylist);
  saveData();
  input.value = '';
  renderPlaylists();
});

// 플레이리스트 목록 렌더링
function renderPlaylists() {
  playlistListEl.innerHTML = '';
  if (playlists.length === 0) {
    playlistListEl.innerHTML = '<p style="opacity: 0.6; font-size: 14px;">생성된 플레이리스트가 없습니다. 위에서 만들어보세요.</p>';
    return;
  }

  playlists.forEach(pl => {
    const card = document.createElement('div');
    card.className = 'playlist-card';
    card.innerHTML = `
      <div style="font-size: 22px;">📁</div>
      <div class="song-info" onclick="openPlaylistDetail('${pl.id}')">
        <div class="song-title">${pl.name}</div>
        <div class="song-artist">${pl.songIds.length}곡 수록됨</div>
      </div>
      <button onclick="deletePlaylist('${pl.id}')" style="font-size: 16px; opacity: 0.6;">🗑️</button>
    `;
    playlistListEl.appendChild(card);
  });
}

function deletePlaylist(plId) {
  playlists = playlists.filter(p => p.id !== plId);
  saveData();
  renderPlaylists();
}

// 플레이리스트에 곡 추가 다이얼로그 (간단 prompt 활용)
function openAddToPlaylistModal(songId) {
  if (playlists.length === 0) {
    alert("먼저 '플레이리스트' 탭에서 플레이리스트를 생성해주세요!");
    return;
  }
  let menuText = "곡을 추가할 플레이리스트 번호를 입력하세요:\n";
  playlists.forEach((pl, idx) => {
    menuText += `${idx + 1}. ${pl.name}\n`;
  });
  
  const choice = prompt(menuText);
  if (choice === null) return;
  const index = parseInt(choice) - 1;
  
  if (playlists[index]) {
    if (!playlists[index].songIds.includes(songId)) {
      playlists[index].songIds.push(songId);
      saveData();
      alert(`'${playlists[index].name}' 플레이리스트에 추가되었습니다!`);
    } else {
      alert("이미 해당 플레이리스트에 포함된 곡입니다.");
    }
  } else {
    alert("올바른 번호를 입력해주세요.");
  }
}

// 플레이리스트 상세 화면 열기
function openPlaylistDetail(plId) {
  activePlaylistId = plId;
  const pl = playlists.find(p => p.id === plId);
  if (!pl) return;

  document.getElementById('playlistsTab').classList.remove('active');
  const detailTab = document.getElementById('playlistDetailTab');
  detailTab.style.display = 'block';
  detailTab.classList.add('active');
  
  document.getElementById('detailPlaylistTitle').textContent = pl.name;

  const plSongs = songs.filter(s => pl.songIds.includes(s.id));
  detailSongListEl.innerHTML = '';
  
  if (plSongs.length === 0) {
    detailSongListEl.innerHTML = '<p style="opacity: 0.6; font-size: 14px;">이 플레이리스트에 곡이 없습니다. 모든 곡 목록에서 ➕ 버튼을 눌러 추가해보세요.</p>';
    return;
  }

  plSongs.forEach((song, index) => {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.innerHTML = `
      <div style="font-size: 22px;">🎵</div>
      <div class="song-info" onclick="playQueue(${index}, getPlaylistSongs('${plId}'))">
        <div class="song-title">${song.title}</div>
        <div class="song-artist">${song.artist}</div>
      </div>
      <button onclick="removeSongFromPlaylist('${plId}', '${song.id}')" style="font-size: 16px; opacity: 0.6;" title="제거">❌</button>
    `;
    detailSongListEl.appendChild(card);
  });
}

function getPlaylistSongs(plId) {
  const pl = playlists.find(p => p.id === plId);
  if (!pl) return [];
  return songs.filter(s => pl.songIds.includes(s.id));
}

function closePlaylistDetail() {
  document.getElementById('playlistDetailTab').style.display = 'none';
  document.getElementById('playlistsTab').classList.add('active');
  activePlaylistId = null;
}

document.getElementById('playAllPlaylistBtn').addEventListener('click', () => {
  if (!activePlaylistId) return;
  const plSongs = getPlaylistSongs(activePlaylistId);
  if (plSongs.length > 0) {
    playQueue(0, plSongs);
  }
});

function removeSongFromPlaylist(plId, songId) {
  const pl = playlists.find(p => p.id === plId);
  if (pl) {
    pl.songIds = pl.songIds.filter(id => id !== songId);
    saveData();
    openPlaylistDetail(plId);
  }
}

// 오디오 재생 큐 관리
function playQueue(index, queueArray) {
  currentQueue = queueArray;
  currentIndex = index;
  playCurrentSong();
}

function playCurrentSong() {
  if (currentQueue.length === 0) return;
  const song = currentQueue[currentIndex];
  
  audioElement.src = song.url;
  audioElement.play();
  playerBar.style.display = 'flex';
  nowPlayingTitle.textContent = song.title;
  playPauseBtn.textContent = '⏸️';

  // 잠금화면 및 에어팟 리모트 제어 연동 (Media Session API)
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      album: 'RunBeat Playlist'
    });

    navigator.mediaSession.setActionHandler('play', () => { audioElement.play(); playPauseBtn.textContent = '⏸️'; });
    navigator.mediaSession.setActionHandler('pause', () => { audioElement.pause(); playPauseBtn.textContent = '▶️'; });
    navigator.mediaSession.setActionHandler('previoustrack', playPrev);
    navigator.mediaSession.setActionHandler('nexttrack', playNext);
  }
}

playPauseBtn.addEventListener('click', () => {
  if (audioElement.paused) {
    audioElement.play();
    playPauseBtn.textContent = '⏸️';
  } else {
    audioElement.pause();
    playPauseBtn.textContent = '▶️';
  }
});

function playNext() {
  if (currentQueue.length === 0) return;
  currentIndex = (currentIndex + 1) % currentQueue.length;
  playCurrentSong();
}

function playPrev() {
  if (currentQueue.length === 0) return;
  currentIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
  playCurrentSong();
}

nextBtn.addEventListener('click', playNext);
prevBtn.addEventListener('click', playPrev);

audioElement.addEventListener('timeupdate', () => {
  if (audioElement.duration) {
    progressBar.value = (audioElement.currentTime / audioElement.duration) * 100;
  }
});

audioElement.addEventListener('ended', playNext);

progressBar.addEventListener('input', (e) => {
  if (audioElement.duration) {
    audioElement.currentTime = (e.target.value / 100) * audioElement.duration;
  }
});

// 초기 실행 시 곡 목록 렌더링
renderSongList();
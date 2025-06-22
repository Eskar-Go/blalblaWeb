// Vérifie si le navigateur supporte l'API Web Speech
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const synthesis = window.speechSynthesis;

if (!window.SpeechRecognition || !synthesis) {
    alert("Désolé, votre navigateur ne supporte pas l'API Web Speech.");
} else {
    // --- PARTIE RECONNAISSANCE VOCALE ---
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR'; // Langue française
    recognition.interimResults = false; // On ne veut que les résultats finaux
    recognition.maxAlternatives = 1;

    const startButton = document.getElementById('startButton');
    const resultDiv = document.getElementById('result');
    const langSelect = document.getElementById('langSelect');
    const translatedTextArea = document.getElementById('translatedText');

    startButton.addEventListener('click', () => {
        resultDiv.textContent = "Je vous écoute...";
        recognition.start();
    });

    // Fonction de traduction via MyMemory
    async function translateText(text, sourceLang, targetLang) {
        if (sourceLang === targetLang) return text;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            if (data.responseData && data.responseData.translatedText) {
                return data.responseData.translatedText;
            } else {
                throw new Error('Réponse API invalide');
            }
        } catch (e) {
            throw new Error('Erreur MyMemory : ' + e.message);
        }
    }

    // Reconnaissance vocale avec traduction
    recognition.addEventListener('result', async (event) => {
        const transcript = event.results[0][0].transcript.trim();
        const targetLang = langSelect.value;
        resultDiv.textContent = "Reconnu : " + transcript;
        if (!transcript) return;
        let translated = transcript;
        if (targetLang !== 'fr') {
            try {
                translated = await translateText(transcript, 'fr', targetLang);
                translatedTextArea.value = translated;
                resultDiv.textContent = "Traduit : " + translated;
            } catch (e) {
                translatedTextArea.value = '';
                resultDiv.textContent = e.message;
            }
        } else {
            translatedTextArea.value = transcript;
        }
        window.lastTranscript = translated;
    });

    recognition.addEventListener('error', (event) => {
        resultDiv.textContent = 'Erreur de reconnaissance : ' + event.error;
    });

    recognition.addEventListener('end', () => {
        console.log('Reconnaissance terminée.');
    });


    // --- PARTIE SYNTHÈSE VOCALE ---
    const speakButton = document.getElementById('speakButton');
    const textToSpeakArea = document.getElementById('textToSpeak');
    const voiceSelect = document.getElementById('voiceSelect');
    const speakTranslatedButton = document.getElementById('speakTranslatedButton');

    // Remplit la liste des voix disponibles
    function populateVoiceList() {
        const voices = synthesis.getVoices();
        voiceSelect.innerHTML = '';
        voices.forEach((voice, i) => {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' [par défaut]' : ''}`;
            voiceSelect.appendChild(option);
        });
    }
    populateVoiceList();
    // Recharge la liste des voix si elle change (évite de recharger la page)
    if (typeof synthesis.onvoiceschanged !== 'undefined') {
        synthesis.onvoiceschanged = () => {
            const current = voiceSelect.value;
            populateVoiceList();
            // Restaure la sélection si possible
            if (voiceSelect.options.length > 0 && current) {
                voiceSelect.value = current;
            }
        };
    }

    speakButton.addEventListener('click', async () => {
        if (synthesis.speaking) {
            console.error('La synthèse vocale est déjà en cours de lecture.');
            return;
        }
        const text = textToSpeakArea.value;
        const targetLang = langSelect.value;
        let toSpeak = text;
        if (targetLang !== 'fr') {
            try {
                toSpeak = await translateText(text, 'fr', targetLang);
            } catch (e) {
                resultDiv.textContent = e.message;
                return;
            }
        }
        const utterance = new SpeechSynthesisUtterance(toSpeak);
        const voices = synthesis.getVoices();
        let selectedIndex = parseInt(voiceSelect.value, 10);
        if (isNaN(selectedIndex) || !voices[selectedIndex]) {
            resultDiv.textContent = 'Aucune voix valide sélectionnée.';
            return;
        }
        const selectedVoice = voices[selectedIndex];
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
        utterance.pitch = 1;
        utterance.rate = 1;
        utterance.onerror = (event) => {
            resultDiv.textContent = 'Erreur de synthèse vocale : ' + event.error;
        };
        synthesis.speak(utterance);
    });

    // Ajout d'un bouton de test vocal
    const testVoiceButton = document.createElement('button');
    testVoiceButton.id = 'testVoiceButton';
    testVoiceButton.textContent = 'Tester la voix sélectionnée';
    voiceSelect.parentNode.insertBefore(testVoiceButton, voiceSelect.nextSibling);

    testVoiceButton.addEventListener('click', () => {
        const voices = synthesis.getVoices();
        let selectedIndex = parseInt(voiceSelect.value, 10);
        if (!voices.length) {
            resultDiv.textContent = 'Aucune voix disponible dans ce navigateur.';
            return;
        }
        if (isNaN(selectedIndex) || !voices[selectedIndex]) {
            resultDiv.textContent = 'Aucune voix valide sélectionnée.';
            return;
        }
        const utterance = new SpeechSynthesisUtterance('Ceci est un test de la voix.');
        utterance.voice = voices[selectedIndex];
        utterance.lang = voices[selectedIndex].lang;
        utterance.onerror = (event) => {
            resultDiv.textContent = 'Erreur de synthèse vocale : ' + event.error;
        };
        synthesis.speak(utterance);
    });

    // Recharge la liste des voix uniquement si elle est vide (évite de perdre la sélection)
    voiceSelect.addEventListener('focus', () => {
        if (voiceSelect.options.length === 0) populateVoiceList();
    });
    voiceSelect.addEventListener('click', () => {
        if (voiceSelect.options.length === 0) populateVoiceList();
    });

    speakTranslatedButton.addEventListener('click', () => {
        const text = translatedTextArea.value;
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = synthesis.getVoices();
        let selectedIndex = parseInt(voiceSelect.value, 10);
        if (isNaN(selectedIndex) || !voices[selectedIndex]) {
            resultDiv.textContent = 'Aucune voix valide sélectionnée.';
            return;
        }
        const selectedVoice = voices[selectedIndex];
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
        utterance.pitch = 1;
        utterance.rate = 1;
        utterance.onerror = (event) => {
            resultDiv.textContent = 'Erreur de synthèse vocale : ' + event.error;
        };
        synthesis.speak(utterance);
    });
}
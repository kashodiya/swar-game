var store = {
    state: {
        lessons: [],
        currentLessonIndex: 0
    }
}
let isDbReady = false;
let dbHelper;   //Inited in the initDB function
const keys = "C#3 D3 D#3 E3 F3 F#3 G3 G#3 A3 A#3 B3 C4 C#4 D4 D#4 E4 F4 F#4 G4 G#4 A4 A#4 B4 C5 C#5 D5 D#5 E5 F5 F#5 G5 G#5 A5 A#5 B5 C6".split(" ");
const swars = "sl Rl rl Gl gl ml Ml pl Dl dl Nl nl s R r G g m M p D d N n su Ru ru Gu gu mu Mu pu Du du Nu nu".split(" ");
const swarsEng = ".S .r .R .g .G .M .m .P .d .D .n .N S r R g G M m P d D n N S. r. R. g. G. M. m. P. d. D. n. N.".split(" ");
let mySynth, mediaRecorder; //Created in initVue()


const Home = Vue.component('Home', {
    template: '#home-template',
    data() {
        return {
            state: store.state,
        }
    },
    methods: {
        deleteLesson(name){
            this.$root.$emit('deleteLesson', {name, goHome: false});
        },
        playGame(index) {
            console.log(`Playing index ${index}`);
            this.$root.$router.push({ path: '/play', query: { index } }).catch(err => { }); //Modes can be add or edit
        },
        editLesson(index){
            this.$root.$router.push({ path: '/editLesson', query: { mode: 'Edit', index } }).catch(err => { }); //Modes can be add or edit
        },
        downloadLesson(lesson){
            let zip = new JSZip();
            zip.file(lesson.name + '.json', JSON.stringify(lesson, null, 2));
            lesson.phrases.forEach((ph, i) => {
                zip.file(`${lesson.name}-${i}-swar.ogg`, ph.swarPhrase.audioBlob, { base64: true });
                zip.file(`${lesson.name}-${i}-aakar.ogg`, ph.aakarPhrase.audioBlob, { base64: true });
            });
            zip.generateAsync({ type: "blob" }).then((finalZipBlob) => {
                let finalFileName = lesson.name + '.zip';
                saveAs(finalZipBlob, finalFileName);
            });
        },
        newLesson(){
            this.$root.$emit('newLesson');
        },
        downloadAllData(){
            this.$root.$emit('downloadAllData');
        },
        test() {
            console.log('test');
        },
        XX1test() {
            // console.log('Calling showMessage...');
            this.$root.$emit('showMessage', { message: 'Hello Hello Hello Hello Hello Hello Hello Hello Hello ', type: 'info' });
        },
        async XXtest() {
            let lesson = {
                name: 'New', id: '3'
            };
            store.state.lessons.push(lesson);
            let result = await dbHelper.saveLesson(lesson, false);
            this.message = result.message;
            console.log({ result });
            this.showMessage = true;
        }
    },
    created() {
        // this.$root.$emit('test');
        console.log('Home created');
    }
})

const Play = Vue.component('Play', {
    template: '#play-template',
    data() {
        return {
            state: store.state,
            index: -1,
            lesson: {},
            playIndexes: [],    //Indexes of phrase for playing
            currentPlayIndexIndex: 0,
            currentPhraseIndex: 0,
            gameTypeIndex: 2,
            gameTypes: ['All in order', 'Random (no repeat)', 'Random (repeat)']
        }
    }, watch: {
        $route: {
            handler() {
                console.log('Route changed!', this.$route.query);
                this.index = this.$route.query.index;
                this.setLesson();
            },
            deep: true
        },
        gameTypeIndex() {
            console.log(`Game type changed to ${this.gameTypes[this.gameTypeIndex]}`);
            this.prepareGame();
        }
    },
    methods: {
        deleteLesson() {
            this.$root.$emit('deleteLesson', this.index);
        },
        editLesson() {
            this.$root.$router.push({ path: '/editLesson', query: { mode: 'Edit', index: this.index } }).catch(err => { }); //Modes can be add or edit
        },
        doNext() {
            this.currentPlayIndexIndex++;
            if (this.currentPlayIndexIndex >= this.playIndexes.length) this.currentPlayIndexIndex = 0;
            this.currentPhraseIndex = this.playIndexes[this.currentPlayIndexIndex];
            console.log(`Doing next, currentPlayIndexIndex = ${this.currentPlayIndexIndex}, currentPhraseIndex = ${this.currentPhraseIndex}`);
            //Immediately play aakar
            this.play('aakar');
        },
        prepareGame() {
            if (this.gameTypeIndex == 0) {    //All
                this.playIndexes = Array.from(Array(this.lesson.phrases.length).keys());
            } else if (this.gameTypeIndex == 1) {    //Random no repeat
                this.playIndexes = shuffle(Array.from(Array(this.lesson.phrases.length).keys()));
            } else if (this.gameTypeIndex == 2) {    //Random repeat
                for (let i = 0; i < 3; i++) {
                    let tempIndexes = shuffle(Array.from(Array(this.lesson.phrases.length).keys()));
                    this.playIndexes.push(...tempIndexes);
                }
            }
            this.currentPlayIndexIndex = 0;
            console.log({ playIndexes: this.playIndexes.join(',') });
            this.play('aakar');
        },
        playPhraseAtIndex(index) {
            //Find index
            this.currentPlayIndexIndex = this.playIndexes.indexOf(index);
            this.play('aakar');
        },
        play(what) {
            let recordingAudio = this.$refs.recordingAudio;
            // let isPlaying = !recordingAudio.paused;
            // console.log(`Playing ${what} phrase... (isPlaying = ${isPlaying})`);
            // if(isPlaying){
            //     console.log('Stopping current playing...');
            //     recordingAudio.pause();
            //     recordingAudio.currentTime = 0;
            // }
            this.currentPhraseIndex = this.playIndexes[this.currentPlayIndexIndex];
            const audioBlob = this.lesson.phrases[this.currentPhraseIndex][what + 'Phrase'].audioBlob;
            const audioURL = window.URL.createObjectURL(audioBlob);
            recordingAudio.src = audioURL;
            recordingAudio.play();
        },
        setLesson() {
            console.log(`Setting lesson at index ${this.index}`);
            let lessonData = this.state.lessons[this.index];
            if (lessonData) {
                this.lesson = { ...lessonData };
            } else {
                this.$root.$emit('showMessage', { message: `Lesson # ${this.index} not found!`, type: 'error' });
            }
        }
    },
    beforeDestroy() {
    },
    mounted() {
        this.prepareGame();
    },
    created() {
        this.index = this.$route.query.index;
        this.setLesson();
        console.log('Play created');
    }
})

const Lesson = Vue.component('Lesson', {
    template: '#lesson-template',
    data() {
        return {
            state: store.state,
            mode: 'Add',
            index: -1,
            originalName: '',
            currentPhraseIndex: -1,
            selectedPhraseIndex: -1,
            lesson: { name: '', phrases: [{ recordingFor: '', recordingAakar: false, recordingSwar: false, swarPhrase: { swarTimeData: [] }, aakarPhrase: { swarTimeData: [] } }] },
            swarPhrase: {}, //Example: {swarTimeData: [...this.swarTimeData], audioBlob: this.$options.audioBlob};
            aakarPhrase: {},
            recording: false,
            // recordingFor: '',       //Aakar, Swar
            // recordingAakar: false,
            // recordingSwar: false,
            recStartDateTime: null,
            midiListenersRregistered: false,
            swarTimeData: [],
            keys, swars, swarsEng            //These come from global vars
        }
    }, watch: {
        $route: {
            handler() {
                console.log('WOW', this.$route);
                this.mode = this.$route.query.mode;
                this.index = this.$route.query.index;
                this.setLesson(this.index);
            },
            deep: true
        },
        // recording() {
        //     console.log('recording changed', this.recording);
        //     if(this.recording){ 
        //         this.registerMidiListeners();
        //         this.startRecording();
        //     }else{
        //         this.stopRecording();
        //     }
        // },
        // recordingAakar(){
        //     this.recording = this.recordingAakar;
        //     this.recordingFor = 'Aakar';
        // },
        // recordingSwar(){
        //     this.recording = this.recordingSwar;
        //     this.recordingFor = 'Swar';
        // },
    }, methods: {
        deleteLesson() {
            this.$root.$emit('deleteLesson', {name: this.lesson.name, goHome: true});
        },
        playGame() {
            console.log(`Playing index ${this.index}`);
            this.$root.$router.push({ path: '/play', query: { index: this.index } }).catch(err => { }); //Modes can be add or edit
        },
        debug(index) {
            console.log(this.lesson.phrases[index])
        },
        playPhrase(index, playFor) {
            console.log(`Playing ${index} for ${playFor}`);
            let recordingAudio = this.$refs.recordingAudio;
            const audioBlob = this.lesson.phrases[index][playFor + 'Phrase'].audioBlob;
            const audioURL = window.URL.createObjectURL(audioBlob);
            recordingAudio.src = audioURL;
            recordingAudio.play();
        },
        disableRecoringFor(phrase, index, recordingFor) {
            let disableIt = true;
            if (this.currentPhraseIndex == -1) {
                //In the begiging
                disableIt = false;
            } else if (!this.recording) {
                //If not recording
                disableIt = false;
            } else if (this.currentPhraseIndex == index && phrase.recordingFor == recordingFor) {
                //If this is the recordingFor and index
                disableIt = false;
            }
            return disableIt;
        },
        setCurrentPhraseIndexAndRecordingState(index, recordingFor) {
            this.currentPhraseIndex = index;
            let phrase = this.lesson.phrases[this.currentPhraseIndex];
            phrase.recordingFor = recordingFor;

            if (phrase.recordingSwar || phrase.recordingAakar) {
                this.registerMidiListeners();
                this.recording = true;
                this.startRecording();
                console.log(`Starting recroding for ${recordingFor} of index ${index}`);
            } else {
                console.log(`Stopping recroding for ${recordingFor} of index ${index}`);
                this.stopRecording();
                this.recording = false;
            }
        },
        cancel() {
            this.$root.$router.push({ name: 'home' }).catch(err => { });
        },
        setLesson(index) {
            console.log('Setting index', index, this.state.lessons);
            if (this.index >= 0) {
                let lessonData = this.state.lessons[index];
                if (lessonData) {
                    //Make a copy of the data
                    this.lesson = { ...lessonData };
                    console.log({ lessonData, setLesson: this.lesson });
                } else {
                    // Lesson ${index} is not found in the database, so just convert edit to add opertion
                    this.$root.$emit('newLesson', {});
                }
            } else {
                this.lesson = { name: makeId(5), phrases: [] };
            }
            if (this.mode == 'Edit') {
                this.originalName = this.lesson.name;
            }
        },
        async saveLesson() {
            if (!isValidFileName(this.lesson.name)) {
                this.$root.$emit('showMessage', { message: 'Invalid name. Ensure that name can be a valid file name.', type: 'error' });
                return;
            }

            if (this.lesson.phrases.length == 0) {
                this.$root.$emit('showMessage', { message: 'Please add a few phrases.', type: 'error' });
                return;
            }
            //Check if all phrase has data and audio
            let allPhraseHasData = this.lesson.phrases.every(ph => ph.aakarPhrase && ph.swarPhrase);
            if (!allPhraseHasData) {
                this.$root.$emit('showMessage', { message: 'Please record all Swars and Aakars for all the phrases.', type: 'error' });
            } else {
                console.log({ allPhraseHasData });
                let result = await dbHelper.saveLesson(this.lesson, false);
                console.log({ lesson: this.lesson, result });
                this.$root.$emit('showMessage', { message: result.message, type: result.error ? 'error' : 'success' });

                if (this.mode == 'Edit' && this.originalName != this.lesson.name) {
                    await dbHelper.deleteLesson(this.originalName);
                }

                // this.$root.$emit('refreshLessonList');
                store.state.lessons = await dbHelper.getAllLessons();


                // After save, change mode to Edit and refresh data
                // console.log(`Finding index of name = ${this.lesson.name}`);
                let index = this.findLessonIndexByName(this.lesson.name);
                this.$root.$router.push({ path: '/editLesson', query: { mode: 'Edit', index } }).catch(err => { }); //Modes can be add or edit

                // this.mode = 'Edit';
                // this.index = this.findLessonIndexByName(this.lesson.name);
                // console.log(`Setting mode to Edit for index = ${this.index}`);
                // this.setLesson(this.index);
            }
        },
        findLessonIndexByName(name) {
            let index = -1;
            for (let i = 0; i < store.state.lessons.length; i++) {
                if (store.state.lessons[i].name == name) {
                    index = i;
                    break;
                }
            }
            return index;
        },
        // async deleteLesson() {
        //     console.log(`Deleting ${this.index} sesion...`);
        //     // TODO: Ask for confirmation
        //     // await dbHelper.deleteLesson(this.lesson.name);
        //     // this.$root.$emit('refreshLessonList');
        //     // this.$root.$router.push({ name: 'home' }).catch(err => { });
        // },
        addNewPhrase() {
            this.lesson.phrases.push({});
            this.currentPhraseIndex = this.lesson.phrases.length - 1;
        },
        addPhrase() {
            if (!this.aakarPhrase.audioBlob || !this.swarPhrase.audioBlob) {
                this.$root.$emit('showMessage', { message: 'Please record swar and aakar phrases before adding phrase.', type: 'error' });
            } else {
                this.lesson.phrases.push({ aakarPhrase: this.aakarPhrase, swarPhrase: this.swarPhrase });
            }
        },
        selectPhrase(index) {
            this.selectedPhraseIndex = index;
            console.log(`Selecting the phrase index ${index}`);
            let recordingAudio = this.$refs.recordingAudio;
            const audioURL = window.URL.createObjectURL(blob);
            recordingAudio.src = audioURL;
        },
        deletePhrase(index) {
            console.log(`Deleting ${index} phrase...`);
            this.lesson.phrases.splice(index, 1);
        },
        // async saveRecord() {
        //     let name = this.getFileName();
        //     if (!name) return;
        //     let zipBlob = await this.getZipBlob();
        //     let fileName = name + '.zip';
        //     // let arrayBuffer = await blob.arrayBuffer();
        //     let record = { type: 'Recordings', name, fileName, zipBlob };
        //     if (this.projectNameOld.length > 0 && name != this.projectNameOld) {
        //         //Update record
        //         let oldKey = this.projectNameOld;
        //         await dbHelper.saveRecord(record, oldKey);
        //     } else {
        //         //Insert record
        //         await dbHelper.saveRecord(record);
        //     }
        //     this.$router.app.$emit('onShowMessage', `Recording data is saved under file name: ${fileName}`);
        //     this.projectNameOld = name;

        //     this.$router.app.$emit('onRenameTab', { tabIndex: this.tabIndex, name });
        //     this.dbRecord = record;
        // },
        startRecording() {
            let chunks = [];
            // let mediaRecorder = this.$options.mediaRecorder;
            console.log('Using Media Recorder: ', mediaRecorder);
            // let recordingAudio = document.getElementById('recordingAudio');
            let recordingAudio = this.$refs.recordingAudio;
            console.log('Starting recording...');
            mediaRecorder.start();
            // this.recState = 'RECORDING';
            // this.recording = true;
            this.recStartDateTime = new Date();

            mediaRecorder.onstop = async (e) => {
                console.log('mediaRecorder is stopped...saving data');
                // let chunks = this.$options.chunks;
                const blob = new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' });
                this.$options.audioBlob = blob;
                chunks = [];
                const audioURL = window.URL.createObjectURL(blob);
                recordingAudio.src = audioURL;

                this.savePhrase();
                // this.audioDataReady = true;
                // await this.saveRecord();
            }

            mediaRecorder.ondataavailable = (e) => {
                console.log('Getting chunks...')
                chunks.push(e.data);
            }
        },
        savePhrase() {
            this.calculateSwarTimes();
            console.table(this.swarTimeData.map(d => { return { st: d.startTime, et: d.endTime, swar: d.swar } }));
            let phrase = this.lesson.phrases[this.currentPhraseIndex];
            if (phrase.recordingFor == 'Aakar') {
                // this.aakarPhrase = {swarTimeData: [...this.swarTimeData], audioBlob: this.$options.audioBlob};
                phrase.aakarPhrase = { swarTimeData: [...this.swarTimeData], audioBlob: this.$options.audioBlob };
            } else {
                // this.swarPhrase = {swarTimeData: [...this.swarTimeData], audioBlob: this.$options.audioBlob};
                phrase.swarPhrase = { swarTimeData: [...this.swarTimeData], audioBlob: this.$options.audioBlob };
            }
            console.log(`Saved ${phrase.recordingFor} phrase at idnex = ${this.currentPhraseIndex}, swar count = ${this.swarTimeData.length}.`);
            this.swarTimeData = [];
            this.$forceUpdate();
        },
        async stopRecording() {
            // let mediaRecorder = this.$options.mediaRecorder;
            mediaRecorder.stop();
        },
        calculateSwarTimes() {
            //Take recStartDateTime and iterate swarTimeData to set time and duration
            this.swarTimeData.forEach(d => {
                // debugger;
                d.startTime = d.startDateTime - this.recStartDateTime;
                d.duration = d.endDateTime - d.startDateTime;
                d.endTime = d.startTime + d.duration;
                // return {startTime, duration, swar: d.swar, keyIndex: d.keyIndex}
                // return {...d, startTime, duration}
            });
            // console.log(this.swarTimeData);
        },
        unregisterMidiListeners() {
            if(mySynth){
                mySynth.removeListener('noteon');
                mySynth.removeListener('noteoff');
            }
        },
        registerMidiListeners() {
            if (this.midiListenersRregistered){
                console.log('Skipping registerMidiListeners, as it is already registered.');
                return;
            };
            console.log('In registerMidiListeners, registering...');
            this.unregisterMidiListeners();
            mySynth.addListener("noteoff", e => {
                if (!this.recording) return;
                console.log('noteoff', e.note.number);
                let keyIndex = this.keys.indexOf(e.note.identifier);
                if (keyIndex != -1) {
                    let relatedNoteonData;
                    //We should iterate from the last element to fist one in swarTimeData
                    for (let i = this.swarTimeData.length - 1; i >= 0; i--) {
                        if (this.swarTimeData[i].keyIndex == keyIndex) {
                            relatedNoteonData = this.swarTimeData[i];
                            break;
                        }
                    }

                    if (relatedNoteonData) {
                        relatedNoteonData.endDateTime = new Date();
                    } else {
                        console.log('WAT!', keyIndex);
                    }
                } else {
                    //2 or more keys were pressed together so missed noteoff of previous key
                    console.log('WAT! keyIndex = -1, e.note.identifier = ' + e.note.identifier);
                }
            });

            mySynth.addListener("noteon", e => {
                // if (!this.recording) return;

                console.log('noteon', e.note.number);
                if (this.recording) {
                    let keyIndex = this.keys.indexOf(e.note.identifier);
                    if (keyIndex != -1) {
                        this.swarTimeData.push({
                            duration: 0, startTime: 0, endTime: 0,     //Calcualted in the calculateSwarTimes()
                            keyIndex,
                            swarEng: swarsEng[keyIndex],
                            swar: swars[keyIndex],
                            // endDateTime:                             This will be set in noteoff event
                            startDateTime: new Date()
                        });
                    } else if (e.note.number == 36) { //Stop recording
                        //This is to stop the recording, it is the lowest key on the our keyboard (Komal .n)
                        console.log('Detected key 36, setting recordingAakar/recordingSwar to false, and calling setCurrentPhraseIndexAndRecordingState.');
                        let phrase = this.lesson.phrases[this.currentPhraseIndex];
                        // if (phrase.recordingFor == 'Aakar') {
                        //     phrase.recordingAakar = false;
                        //     phrase.recordingSwar = true;
                        // } else {
                        //     phrase.recordingAakar = true;
                        //     phrase.recordingSwar = false;
                        // }
                        phrase.recordingSwar = false;
                        phrase.recordingAakar = false;
                        this.setCurrentPhraseIndexAndRecordingState(this.currentPhraseIndex, phrase.recordingFor);
                        this.$forceUpdate();
                    } else {
                        console.log('Only keys from mandra, madhaya and taar saptak is recorded.');
                    }
                } else if (e.note.number == 37 || e.note.number == 39) {
                    let forWhat = e.note.number == 37 ? 'Swar' : 'Aakar';
                    console.log(`Starting to record ${forWhat} on key = ${e.note.number}`);
                    if(this.currentPhraseIndex == -1){
                        this.addNewPhrase();
                    }
                    let phrase = this.lesson.phrases[this.currentPhraseIndex];
                    phrase.recordingSwar = (forWhat == 'Swar');
                    phrase.recordingAakar = (forWhat == 'Aakar');
                    this.setCurrentPhraseIndexAndRecordingState(this.currentPhraseIndex, forWhat);                    
                } else {
                    console.log(`Ignoring note: ${e.note.number}`);
                }
            }, { channels: [1, 2, 3] });
            this.midiListenersRregistered = true;
            console.log('WebMidi synth key event registered');
        }
        // setMode(mode) {
        //     console.log({ mode });
        // }
    },
    beforeDestroy() {
        //Stop media and midi 
        console.log('Stopping media and midi before unmunting.');
        mediaRecorder.onstop = null;
        if (mediaRecorder.state == 'active') mediaRecorder.stop();
        this.unregisterMidiListeners();
    },
    mounted() {
        console.log('Lesson mounted');
        // console.log({ mode: this.$route.query.mode });
        this.mode = this.$route.query.mode;
        if (this.mode == "New") this.lesson.name = makeId(5);
        this.index = this.$route.query.index;
        this.setLesson(this.index);
        // if(this.mode == "Edit" && this.index < 0){
        //     console.log('Oh no');            
        // }
    },
    created() {
        if (mySynth) {
            this.registerMidiListeners();
        } else {
            console.log('Waiting for webMidiEnabled event...');
            this.$root.$on('webMidiEnabled', this.registerMidiListeners);
        }

        console.log('Lesson created');
    }
})

const Bar = Vue.component('Bar', {
    template: '#bar-template',
    data() {
        return {
            state: store.state
        }
    },
    methods: {
    },
    created() {
        console.log('Bar created');
    }
})

function initVue() {

    const routes = [
        { path: '/', component: Home, name: 'home' },
        { path: '/newLesson', component: Lesson, name: "newLesson", props: true },
        { path: '/editLesson', component: Lesson, name: "editLesson", props: true },
        { path: '/play', component: Play, name: "play", props: true },
        { path: '/bar', component: Bar }
    ]

    const router = new VueRouter({
        routes
    })

    new Vue({
        data() {
            return {
                state: store.state,
                showMessageToggle: false,
                message: '',
                clickedForEdit: false,
                selectedLessonIndex: -1,
                genericDialog: {
                    toggle: false,
                    actions: [],
                    title: '',
                    body: '',
                    callbackEventName: ''
                },
                messageTimer: null,
                messageType: 'success',  //Possible values: success warning info error
                deviceId: '',
                deviceName: '',
                mediaRecorderCreated: false,
                keys, swars, swarsEng            //These come from global vars
            }
        },
        watch: {
            selectedLessonIndex() {
                console.log({ clickedForEdit: this.clickedForEdit });
                this.clickedForEdit = false;
                if (this.clickedForEdit) {
                    this.loadLesson(this.state.lessons[this.selectedLessonIndex], this.selectedLessonIndex);
                } else {
                    this.playLesson(this.selectedLessonIndex);
                }
            }
        },
        methods: {
            async downloadAllData() {
                let lessonZipBlobs = [];    // {fileName, zipBlob}
                let finalZip = new JSZip();
                let promises = [];

                //Generate zip per lesson
                this.state.lessons.forEach((lesson, l) => {
                    let zip = new JSZip();
                    zip.file(lesson.name + '.json', JSON.stringify(lesson, null, 2));
                    lesson.phrases.forEach((ph, i) => {
                        zip.file(`${lesson.name}-${i}-swar.ogg`, ph.swarPhrase.audioBlob, { base64: true });
                        zip.file(`${lesson.name}-${i}-aakar.ogg`, ph.aakarPhrase.audioBlob, { base64: true });
                    });
                    promises.push(zip.generateAsync({ type: "blob" }));
                })

                //Populate zip of all lesson zips
                await Promise.all(promises).then((zipFiles) => {
                    zipFiles.forEach((zf, i) => {
                        let fileName = this.state.lessons[i].name + '.zip';
                        finalZip.file(fileName, zf, { base64: true });
                    })
                });

                // Generate final zip blob
                finalZip.generateAsync({ type: "blob" }).then((finalZipBlob) => {
                    let finalFileName = 'data.zip';
                    saveAs(finalZipBlob, finalFileName);
                });
            },
            newLesson() {
                let routeName = this.$root.$route.name;
                if (routeName == 'newLesson') {
                    this.$root.$emit('showMessage', { message: 'You are already adding a lesson.', type: 'warning' });
                    return;
                }
                this.$root.$emit('hideMessage');
                //TODO: Check if Leson component is in dirty state so that user would loose data 

                console.log('Adding new lesson', { routeName });
                // this.$root.$router.push({ name: 'newLesson', params: { mode: 'add' } }).catch(err => { }); //Modes can be add or edit
                this.$root.$router.push({ path: '/newLesson', replace: false, query: { mode: 'New' } }).catch(err => { }); //Modes can be add or edit

                // this.$root.$router.push({ name: 'newLesson', params: { mode: 'add'} }).catch(err => { }); //Modes can be add or edit
                // this.$root.$emit('setMode', { mode: 'ADD' });
            },
            playLesson(index) {
                console.log(`Playing index ${index}`);
                this.$root.$router.push({ path: '/play', query: { index } }).catch(err => { }); //Modes can be add or edit
            },
            loadLesson(lesson, index) {
                console.log(`Loading index ${index}`);
                let routeName = this.$root.$route.name;
                console.log({ route: this.$root.$route });
                if (routeName == 'editLesson' && this.$root.$route.query.index == index) {
                    this.$root.$emit('showMessage', { message: 'You are already editing this lesson.', type: 'warning' });
                    return;
                }
                this.$root.$emit('hideMessage');
                //TODO: Check if Leson component is in dirty state so that user would loose data 

                console.log(`Loading Id = ${lesson.id}, Index = ${index}`);
                this.state.currentLessonIndex = index;
                // this.$root.$router.push({ name: 'editLesson', params: { mode: 'edit', index } }).catch(err => { }); //Modes can be add or edit
                this.$root.$router.push({ path: '/editLesson', replace: false, query: { mode: 'Edit', index } }).catch(err => { }); //Modes can be add or edit
                // this.$root.$router.push({ name: 'editLesson', params: { mode: 'edit', index} }).catch(err => { }); //Modes can be add or edit
                // this.$root.$emit('setMode', { mode: 'EDIT' });
            },
            showMessage(opt) {
                // console.log('Doing showMessage');
                // console.log('showMessage is called', opt);
                this.message = opt.message;
                this.messageType = opt.type;
                this.showMessageToggle = true;
                if (this.messageTimer) {
                    clearTimeout(this.messageTimer);
                }
                this.messageTimer = setTimeout(() => {
                    this.showMessageToggle = false
                }, 4000)
            },
            onMidiEnabled() {
                if (WebMidi.inputs.length < 1) {
                    console.log('No MIDI device detected.');
                    this.deviceId = 'Error';
                    this.deviceName = 'Not Found';
                    this.$root.$emit('showMessage', { message: 'MIDI devide not attached. Please attache it.', type: 'error' });

                    return
                }

                WebMidi.inputs.forEach((device, index) => {
                    this.deviceId = index;
                    this.deviceName = device.name;
                });

                mySynth = WebMidi.inputs[0];
                console.log('WebMidi enabled');
                this.$root.$emit('webMidiEnabled');
            },
            enableWebMidi() {
                WebMidi.enable().then(this.onMidiEnabled).catch(err => console.log(err));
            },
            createMediaRecorder() {
                console.log('Creating Media Recorder...');
                //Docs: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
                const constraints = { audio: true };
                navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
                    // this.$options.mediaRecorder = new MediaRecorder(stream);
                    mediaRecorder = new MediaRecorder(stream);
                    this.mediaRecorderCreated = true;
                    console.log('Media Recorder created');
                }, () => {
                    console.log('Error getting: navigator.mediaDevices.getUserMedia');
                });
            },
            async refreshLessonList() {
                console.log('Refreshing lessons from DB');
                store.state.lessons = await dbHelper.getAllLessons();
            },
            test() {
                console.log('Test event called.');
                // console.log({ swarTimeData: this.swarTimeData });
            },
            deleteLesson({name, goHome}) {
                if(!goHome) goHome = false;
                this.$root.$emit('showGenericDialog', {
                    title: 'Delete lesson',
                    body: 'Do you want to delete this lesson?',
                    actions: ['Delete', 'Cancel'],
                    callbackEventName: 'deleteConformation',
                    callbackData: {name, goHome}
                });
            },
            async deleteConformation(info) {
                // console.log('Delete confirmation called in Lesson...');
                let action = info.actionName;
                let name = info.callbackData.name;
                let goHome = info.callbackData.goHome;
                if (action == 'Delete') {
                    console.log(`Deleting lesson...not...index = ${name}, goHome = ${goHome}`);

                    // await dbHelper.deleteLesson(name);
                    // this.refreshLessonList();
                    if(goHome){
                        this.$root.$router.push({ name: 'home' }).catch(err => { });
                    }
                }
            },
            showGenericDialog(dialog) {
                // this.genericDialog = dialog;
                this.genericDialog.title = dialog.title;
                this.genericDialog.body = dialog.body;
                this.genericDialog.actions = dialog.actions;
                this.genericDialog.callbackEventName = dialog.callbackEventName;
                this.genericDialog.toggle = true;
                this.genericDialog.callbackData = dialog.callbackData;
            },
            genericDialogAction(actionName, callbackData) {
                console.log(`GenericDialog action = ${actionName}`);
                this.genericDialog.toggle = false;
                this.$root.$emit(this.genericDialog.callbackEventName, {actionName, callbackData});
            },
        },
        beforeDestroy() {
            this.$root.$off('deleteConformation');
        },
        async created() {
            this.$root.$on('deleteLesson', this.deleteLesson);
            this.$root.$on('deleteConformation', this.deleteConformation);
            // let lessons = await dbHelper.getAllLessons();
            // console.log({lessons});
            // this.state.lessons = lessons;
            this.enableWebMidi();
            this.createMediaRecorder();
            console.log('App created');
            this.$on('refreshLessonList', this.refreshLessonList);
            this.$on('showMessage', this.showMessage);
            this.$on('newLesson', this.newLesson);
            this.$on('downloadAllData', this.downloadAllData);
            this.$on('showGenericDialog', this.showGenericDialog);
            this.$on('hideMessage', () => { this.showMessageToggle = false });
            this.$on('test', this.test);
        },
        el: '#app',
        router,
        vuetify: new Vuetify(),
    });
}

async function init() {
    // loadServiceWorker();
    await initDB();
    initVue();
    // createPDF();
}

(async () => {
    init();
})();


function makeId(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}

async function initDB() {
    let dbName = 'lessons-db';
    let storeNames = ['Lessons'];
    let db = await idb.openDB(dbName, 1, {
        upgrade(db, oldVersion, newVersion, transaction) {
            console.log({ db, oldVersion, newVersion, transaction });
            if (oldVersion < 1) {
                db.createObjectStore(storeNames[0]);
            }
        },
    });
    console.log('DB is connected');

    dbHelper = {

        saveLesson: async (lesson, overwrite) => {
            console.log('Saving lesson...', lesson);
            let exist = await dbHelper.lessonExist(lesson);
            if (!overwrite && exist) {
                console.log(`Lesson name '${lesson.name}' already exist.`);
                return { error: true, message: `Lesson name '${lesson.name}' already exist.` };
            }
            await db.put('Lessons', lesson, lesson.name);
            return { error: false, message: `Lesson '${lesson.name}' saved successfully!` };
        },

        lessonExist: async (lesson) => {
            let lessonFound = await db.get('Lessons', lesson.name + '1');
            console.log('Finding lesson...found:', lessonFound);
            return lessonFound;
        },

        getAllLessons: async () => {
            return await db.getAll(storeNames[0]);
        },

        deleteLesson: async (lessonName) => {
            await db.delete(storeNames[0], lessonName);
            console.log(`Lesson '${lessonName}' is deleted`);
        },

    }
    isDbReady = true;

    store.state.lessons = await dbHelper.getAllLessons();
    console.log('dbHelper is ready');
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}

var isValidFileName = (function () {
    var rg1 = /^[^\\/:\*\?"<>\|]+$/; // forbidden characters \ / : * ? " < > |
    var rg2 = /^\./; // cannot start with dot (.)
    var rg3 = /^(nul|prn|con|lpt[0-9]|com[0-9])(\.|$)/i; // forbidden file names
    return function isValid(fname) {
        return rg1.test(fname) && !rg2.test(fname) && !rg3.test(fname);
    }
})();
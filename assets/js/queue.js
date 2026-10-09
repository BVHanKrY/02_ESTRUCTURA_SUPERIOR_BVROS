/* =========================================================
   BVROS QUEUE
   Cola + anterior + siguiente + autoplay
   ========================================================= */

const QUEUE_KEY =
    'bvros_queue_v2';

class BVrosQueue {

    constructor() {

        this.tracks = [];
        this.index = -1;
        this.autoplay = true;

        window.BVrosQueue = this;
    }

    setTracks(tracks) {

        this.tracks =
            Array.isArray(tracks)
                ? tracks
                : [];

        this.save();
    }

    setCurrent(slug) {

        this.index =
            this.tracks.findIndex(
                track =>
                    track.slug === slug
            );

        this.save();
    }

    current() {

        if (
            this.index < 0 ||
            this.index >= this.tracks.length
        ) {
            return null;
        }

        return this.tracks[this.index];
    }

    next() {

        if (!this.tracks.length) {
            return null;
        }

        let nextIndex =
            this.index + 1;

        if (
            nextIndex >=
            this.tracks.length
        ) {
            nextIndex = 0;
        }

        this.index =
            nextIndex;

        this.save();

        return this.current();
    }

    previous() {

        if (!this.tracks.length) {
            return null;
        }

        let previousIndex =
            this.index - 1;

        if (previousIndex < 0) {
            previousIndex =
                this.tracks.length - 1;
        }

        this.index =
            previousIndex;

        this.save();

        return this.current();
    }

    save() {

        try {

            localStorage.setItem(
                QUEUE_KEY,
                JSON.stringify({
                    tracks:
                        this.tracks,

                    index:
                        this.index,

                    autoplay:
                        this.autoplay
                })
            );

        } catch (error) {

            console.error(
                'BVros queue:',
                error
            );
        }
    }

    restore() {

        try {

            const state =
                JSON.parse(
                    localStorage.getItem(
                        QUEUE_KEY
                    )
                );

            if (!state) return;

            this.tracks =
                state.tracks || [];

            this.index =
                Number.isInteger(
                    state.index
                )
                    ? state.index
                    : -1;

            this.autoplay =
                state.autoplay !== false;

        } catch (error) {

            console.error(
                error
            );
        }
    }
}

const queue =
    new BVrosQueue();

queue.restore();

export default queue;

window.BVrosQueue =
    queue;
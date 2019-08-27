(function() {
    Cryptodog.color = {
        all: [
            '#d02fc8',
            '#3b3dc4',
            '#e07415',
            '#c3182f',
            '#2086df',
            '#2f04f1',
            '#18582d',
            '#960df2',
            '#768e71',
            '#800000',
            '#003366',
            '#468499',
            '#660066',
            '#0e2f44',
            '#8a2be2',
            '#794044',
            '#3b5998',
            '#084C9E',
            '#008080',
            '#4B0082',
            '#843179',
            '#023750',
            '#193446',
            '#36384c',
            '#613843',
            '#910a40',
            '#340284',
            '#0f9b7d',
            '#016840',
            '#033a5b',
            '#4f745e',
            '#818656',
            '#6d6866',
            '#334251'
        ],

        push: function(color) {
            if (!this.available.includes(color)) {
                this.available.push(color);
            }
        },

        pop: function() {
            if (this.available.length) {
                let n = Math.floor(Math.random() * this.available.length);
                let color = this.available[n];
                this.available.splice(n, 1);
                return color;
            }

            return this.random();
        },

        random: function() {
            return this.all[Math.floor(Math.random() * this.all.length)];
        },

        reset: function() {
            this.available = this.all.slice(0);
        }
    };

    Cryptodog.color.available = Cryptodog.color.all.slice(0);
})();

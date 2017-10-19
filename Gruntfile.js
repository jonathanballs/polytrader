module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({

        // Typescript
        ts: {

            // Server
            server: {
                src: ["src/**/*ts"],
                outDir: "dist",
                options: {
                    rootDir: "./src/",
                    target: "es2017",
                    module: "commonjs",
                    sourceMap: true,
                    moduleResolution: "node"
                }
            },

            // Poloniex wrapper
            poloniex_wrapper: {
                src: ["lib/poloniex-wrapper/src/*ts"],
                outDir: "lib/poloniex-wrapper/lib/",
                options: {
                    rootDir: ["./lib/poloniex-wrapper/src/"],
                    target: "es2017",
                    module: "commonjs",
                    sourceMap: true,
                    moduleResolution: "node",
                    declaration: true
                }
            }
        },

        copy: {
            pug: {
                files: [
                    {expand: true, cwd: 'src/', src: ['./**/*pug'], dest: 'dist/views'}
                ]
            }
        },

        watch: {
            ts: {
                files: ["src/**/*ts", "lib/poloniex-wrapper/src/*ts"],
                tasks: ["ts"]
            },
            pug: {
                files: ["src/**/*pug"],
                tasks: ["copy"]
            }
        }
    });

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Default task(s).
    grunt.registerTask('default', ['ts:poloniex_wrapper', 'ts:server', 'copy']);

};

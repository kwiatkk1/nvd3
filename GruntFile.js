module.exports = function(grunt) {

    //Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: ''
            },
            dist: {
                src: [
                     'src/intro.js',
                     'src/core.js',
                     'src/tooltip.js',
                     'src/utils.js',
                     'src/models/axis.js',
                     'src/models/historicalBar.js',
                     'src/models/bullet.js',
                     'src/models/bulletChart.js',
                     'src/models/cumulativeLineChart.js',
                     'src/models/discreteBar.js',
                     'src/models/discreteBarChart.js',
                     'src/models/distribution.js',
                     'src/models/indentedTree.js',
                     'src/models/legend.js',
                     'src/models/line.js',
                     'src/models/lineChart.js',
                     'src/models/linePlusBarChart.js',
                     'src/models/lineWithFocusChart.js',
                     'src/models/linePlusBarWithFocusChart.js',
                     'src/models/multiBar.js',
                     'src/models/multiBarChart.js',
                     'src/models/multiBarHorizontal.js',
                     'src/models/multiBarHorizontalChart.js',
                     'src/models/multiChart.js',
                     'src/models/ohlcBar.js',
                     'src/models/pie.js',
                     'src/models/pieChart.js',
                     'src/models/scatter.js',
                     'src/models/scatterChart.js',
                     'src/models/scatterPlusLineChart.js',
                     'src/models/sparkline.js',
                     'src/models/sparklinePlus.js',
                     'src/models/stackedArea.js',
                     'src/models/stackedAreaChart.js',
                     'src/outro.js'
                     ],
                dest: 'nv.d3.js'
            },
            multibar: {
                src: [
                     'src/intro.js',
                     'src/core.js',
                     'src/tooltip.js',
                     'src/utils.js',
                     'src/models/axis.js',
                     'src/models/legend.js',
                     'src/models/multiBar.js',
                     'src/models/multiBarChart.js',
                     'src/outro.js'
                     ],
                dest: 'nv.d3.multibar.js'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                    '<%= grunt.template.today("yyyy-mm-dd") %> */'
            },
            js: {
                files: {
                    'nv.d3.min.js': ['nv.d3.js']
                }
            }
        },
        jshint: {
            foo: {
                src: "src/**/*.js"
            },
            options: {
                jshintrc: '.jshintrc'
            }
        },
        watch: {
            js: {
                files: ["src/**/*.js"],
                tasks: ['concat']
            }
        },

    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['concat:dist']);
    grunt.registerTask('production', ['concat:dist', 'uglify']);
    grunt.registerTask('multibar', ['concat:multibar']);
    grunt.registerTask('lint', ['jshint']);
};

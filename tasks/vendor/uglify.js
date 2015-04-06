module.exports = {
  dist: {
    options: {
      sourceMap: true,
      compress: {},
      sourceMapName: '<%= yeoman.dist %>/ngMask.min.map'
    },
    files: {
      '<%= yeoman.dist %>/ngMask.min.js': ['<%= yeoman.dist %>/ngMask.js']
    }
  }
}
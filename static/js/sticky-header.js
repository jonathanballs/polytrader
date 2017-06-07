// JavaScript Document
 
  $(document).ready(function(){
  	"use strict";
    $(".navigation").sticky({topSpacing:0});
  });
 $(document).ready(function(){
    $("body").scrollspy({
        target: ".navigation",
        offset: 70
    }) 
});
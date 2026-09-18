document.addEventListener("DOMContentLoaded", function () {

    /*
     * Bazvor Intro Screen
     *
     * Intro duration:
     * 5 seconds
     */

    const INTRO_TIME = 5000;


    setTimeout(function () {

        /*
         * After 5 seconds,
         * open the actual home page.
         */

        window.location.replace("home.html");

    }, INTRO_TIME);

});
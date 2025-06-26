// https://dev.to/jeetvora331/throttling-in-javascript-easiest-explanation-1081

function throttle(mainFunction, delay) {
    let timerFlag = null;
    return (...args) => {
        if (timerFlag === null) { 
            mainFunction(...args); 
            timerFlag = setTimeout(() => { 
                timerFlag = null; 
            }, delay);
        }
    };
}

export { throttle };
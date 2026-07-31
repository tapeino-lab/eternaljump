function generateSignature(alt, coins, t, lang) {
    let str = `${alt}-${coins}-${t}-${lang}-secret`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        let char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

for (let t = 147000; t < 148000; t++) {
    if (generateSignature(144000, 110, t, "JPN") === "-8dhmg7") {
        console.log("Found t1: " + t);
        break;
    }
}

for (let t = 237000; t < 238000; t++) {
    if (generateSignature(144000, 102, t, "JPN") === "-kx0nky") {
        console.log("Found t2: " + t);
        break;
    }
}

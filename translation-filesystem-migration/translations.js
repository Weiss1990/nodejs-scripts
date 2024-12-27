const fs = require('fs');
const path = require('path');

// locales supported by system
const supportedLocales = [
    'en',
    'cs',
    'da',
    'de',
    'el',
    'es',
    'fi',
    'fr',
    'hu',
    'it',
    'ko',
    'nb-NO',
    'nl',
    'pl',
    'pt',
    'ro',
    'ru',
    'sk',
    'sv',
    'tr',
    'zh-Hans',
    'zh-Hant',
];

// mapper between  system1 locale keys and system2 locale keys
const localeMapper = {
    en: 'en-US',
    'zh-Hans': 'zh-CN',
    'zh-Hant': 'zh-TW',
};

const pathMapper = {
    'rules-debug': 'debug',
};

const nodeKeyToNamespaceMapper = {
    'input-parameters': 'InputParameters',
    'data-collector-v2': 'DataCollector-V2',
    'data-collector-v2-1': 'DataCollector-V2-1',
    'list-data-collector-v2': 'ListDataCollector-V2',
    'list-data-collector-v2-1': 'ListDataCollector-V2-1',
    result: 'result',
    'result-v2': 'Result-V2',
    topology: 'topology',
    'rules-debug': 'rules-debug',
};
const availableNodes = Object.keys(nodeKeyToNamespaceMapper);

const templateLocaleFilePath = path.join(__dirname, `/i18n/template.json`);
const templateLocaleFileJSON = fs.readFileSync(templateLocaleFilePath, { encoding: 'utf-8' });
const templateLocaleFileData = JSON.parse(templateLocaleFileJSON);

try {
    goThroughLocales();
} catch (e) {
    console.log('Cannot provide translations, see error:', e);
}

function goThroughLocales() {
    for (const locale of supportedLocales) {
        const localeFolderName = localeMapper[locale] || locale;
        moveTranslationsToNode(locale, localeFolderName);
    }
}

function isLocaleFileJsonIsNotEmpty(localeFileJSON) {
    return localeFileJSON && Object.keys(JSON.parse(localeFileJSON)).length > 0;
}

function moveTranslationsToNode(locale, localeFolderName) {
    const localeFilePath = path.join(__dirname, `/i18n/${locale}.json`);
    let localeFileJSON;
    if (fs.existsSync(localeFilePath)) {
        const contents = fs.readFileSync(localeFilePath, { encoding: 'utf-8' });
        localeFileJSON = isLocaleFileJsonIsNotEmpty(contents) ? contents : templateLocaleFileJSON;
    } else {
        localeFileJSON = templateLocaleFileJSON;
    }

    const localeFileData = JSON.parse(localeFileJSON);
    const availableNodesForLocale = Object.keys(localeFileData);
    const missedNodes = availableNodes.filter((aN) => !availableNodesForLocale.includes(aN));

    if (missedNodes.length > 0) {
        const dataForMissedNodes = {};
        for (const missedNode of missedNodes) {
            dataForMissedNodes[missedNode] = templateLocaleFileData[missedNode];
        }

        createLocaleFolderAndFillWithContents(dataForMissedNodes, localeFolderName);
    }

    createLocaleFolderAndFillWithContents(localeFileData, localeFolderName);
}

function createLocaleFolderAndFillWithContents(localeFileJSON, localeFolderName) {
    for (const [nodeKey, localeData] of Object.entries(localeFileJSON)) {
        const pth = path.join(
            __dirname,
            `/rules-nodes/rules-node-${pathMapper[nodeKey] || nodeKey}/locales/${localeFolderName}`
        );

        fs.mkdirSync(pth, { recursive: true });

        const translationsForNode = {
            [nodeKey]: compariseAndFill(localeData, templateLocaleFileData[nodeKey]),
        };
        fs.writeFileSync(`${pth}/${nodeKey}.json`, JSON.stringify(translationsForNode, null, 2));

        let localeHtml = localeData['HTML_HELP_TEMPLATE']
            ? localeData['HTML_HELP_TEMPLATE']
            : templateLocaleFileData[nodeKey]['HTML_HELP_TEMPLATE'];

        if (localeHtml) {
            const helpTemplate = `
              <script type="text/html" data-help-name="${nodeKeyToNamespaceMapper[nodeKey]}">
              ${localeHtml}
              </script>
            `;
            fs.writeFileSync(`${pth}/${nodeKey}.html`, helpTemplate);
        }
    }
}

function compariseAndFill(data, templateData) {
    const dataAfterComparison = {};

    for (let key in templateData) {
        if (key !== 'HTML_HELP_TEMPLATE') {
            nonHtmlHelpTranslation(data, dataAfterComparison, key, templateData);
        }
    }

    return dataAfterComparison;
}

function nonHtmlHelpTranslation(data, dataAfterComparison, key, templateData) {
    if (typeof templateData[key] !== 'object') {
        if (data) {
            dataAfterComparison[key] = data[key] || templateData[key];
        } else {
            dataAfterComparison[key] = templateData[key];
        }
    } else {
        if (data) {
            dataAfterComparison[key] = compariseAndFill(data[key], templateData[key]);
        }
    }
}

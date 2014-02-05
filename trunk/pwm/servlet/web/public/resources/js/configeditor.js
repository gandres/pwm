/*
 * Password Management Servlets (PWM)
 * http://code.google.com/p/pwm/
 *
 * Copyright (c) 2006-2009 Novell, Inc.
 * Copyright (c) 2009-2014 The PWM Project
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */

var clientSettingCache = { };
var preferences = { };

function readSetting(keyName, valueWriter) {
    require(["dojo"],function(dojo){
        dojo.xhrGet({
            url:"ConfigEditor?processAction=readSetting&key=" + keyName + "&pwmFormID=" + PWM_GLOBAL['pwmFormID'],
            contentType: "application/json;charset=utf-8",
            preventCache: true,
            dataType: "json",
            handleAs: "json",
            error: function(errorObj) {
                PWM_MAIN.showError("Unable to communicate with server.  Please refresh page.");
                console.log("error loading " + keyName + ", reason: " + errorObj);
            },
            load: function(data) {
                console.log('read data for setting ' + keyName);
                var resultValue = data.value;
                valueWriter(resultValue);
                var isDefault = data['isDefault'];
                updateSettingDisplay(keyName, isDefault)
            }
        });
    });
}

function writeSetting(keyName, valueData) {
    require(["dojo"],function(dojo){
        var jsonString = dojo.toJson(valueData);
        dojo.xhrPost({
            url: "ConfigEditor?processAction=writeSetting&pwmFormID=" + PWM_GLOBAL['pwmFormID'] + "&key=" + keyName,
            postData: jsonString,
            contentType: "application/json;charset=utf-8",
            encoding: "utf-8",
            dataType: "json",
            handleAs: "json",
            preventCache: true,
            error: function(errorObj) {
                PWM_MAIN.showError("Unable to communicate with server.  Please refresh page.");
                console.log("error writing setting " + keyName + ", reason: " + errorObj)
            },
            load: function(data) {
                console.log('wrote data for setting ' + keyName);
                var isDefault = data['isDefault'];
                updateSettingDisplay(keyName, isDefault)
                if (data['errorMessage']) {
                    PWM_MAIN.showError(data['errorMessage']);
                } else {
                    PWM_MAIN.clearError();
                }
            }
        });
    });
}

function resetSetting(keyName) {
    require(["dojo"],function(dojo){
        var jsonData = { key:keyName };
        var jsonString = dojo.toJson(jsonData);
        dojo.xhrPost({
            url: "ConfigEditor?processAction=resetSetting&pwmFormID=" + PWM_GLOBAL['pwmFormID'],
            postData: jsonString,
            contentType: "application/json;charset=utf-8",
            dataType: "json",
            handleAs: "json",
            sync: true,
            error: function(errorObj) {
                PWM_MAIN.showError("error resetting setting " + keyName + ", reason: " + errorObj)
            },
            load: function() {
                console.log('reset data for ' + keyName);
            }
        });
    });
}

function updateSettingDisplay(keyName, isDefault) {
    var resetImageButton = PWM_MAIN.getObject('resetButton-' + keyName);
    if (!isDefault) {
        resetImageButton.style.visibility = 'visible';
        try {
            PWM_MAIN.getObject('title_' + keyName).classList.add("modified");
        } catch (e) {
            console.log('error adding "modified" css class to "title_' + keyName + '" elementID, error=' + e);
        }
    } else {
        resetImageButton.style.visibility = 'hidden';
        try {
            PWM_MAIN.getObject('title_' + keyName).classList.remove("modified");
        } catch (e) {
            console.log('error removing "modified" css class to "title_' + keyName + '" elementID, error=' + e);
        }
    }
}

function clearDivElements(parentDiv, showLoading) {
    var parentDivElement = PWM_MAIN.getObject(parentDiv);
    if (parentDivElement != null) {
        if (parentDivElement.hasChildNodes()) {
            while (parentDivElement.childNodes.length >= 1) {
                var firstChild = parentDivElement.firstChild;
                parentDivElement.removeChild(firstChild);
            }
        }
        if (showLoading) {
            var newTableRow = document.createElement("tr");
            newTableRow.setAttribute("style", "border-width: 0");
            parentDivElement.appendChild(newTableRow);


            var newTableData = document.createElement("td");
            newTableData.setAttribute("style", "border-width: 0");
            newTableData.innerHTML = PWM_STRINGS['Display_PleaseWait'];
            newTableRow.appendChild(newTableData);
        }
    }
}

function addAddLocaleButtonRow(parentDiv, keyName, addFunction) {
    var newTableRow = document.createElement("tr");
    newTableRow.setAttribute("style", "border-width: 0");

    var td1 = document.createElement("td");
    td1.setAttribute("style", "border-width: 0");
    td1.setAttribute("colspan", "5");

    var selectElement = document.createElement("select");
    selectElement.setAttribute('id', keyName + '-addLocaleValue');
    td1.appendChild(selectElement);

    var addButton = document.createElement("button");
    addButton.setAttribute('id', keyName + '-addLocaleButton');
    addButton.setAttribute("type", "button");
    addButton.innerHTML = 'Add Locale';
    td1.appendChild(addButton);

    newTableRow.appendChild(td1);
    var parentDivElement = PWM_MAIN.getObject(parentDiv);
    parentDivElement.appendChild(newTableRow);

    require(["dijit/form/Select","dijit/form/Button"],function(Select,Button){
        var availableLocales = PWM_GLOBAL['localeInfo'];

        var localeMenu = [];
        for (var localeIter in availableLocales) {
            if (localeIter != PWM_GLOBAL['defaultLocale']) {
                localeMenu.push({label: availableLocales[localeIter], value: localeIter})
            }
        }

        PWM_MAIN.clearDijitWidget(keyName + '-addLocaleValue');
        new Select({
            id: keyName + '-addLocaleValue',
            options: localeMenu,
            style: 'width: 175px'
        }, keyName + '-addLocaleValue');

        PWM_MAIN.clearDijitWidget(keyName + '-addLocaleButton');
        new Button({
            id: keyName + '-addLocaleButton',
            onClick: addFunction
        }, keyName + '-addLocaleButton');

        return newTableRow;
    });
}

// -------------------------- locale table handler ------------------------------------
var LocaleTableHandler = {};

LocaleTableHandler.initLocaleTable = function(parentDiv, keyName, regExPattern, syntax) {
    console.log('LocaleTableHandler init for ' + keyName);
    clientSettingCache[keyName + "_regExPattern"] = regExPattern;
    clientSettingCache[keyName + "_syntax"] = syntax;
    clientSettingCache[keyName + "_parentDiv"] = parentDiv;
    clearDivElements(parentDiv, true);
    readSetting(keyName, function(resultValue) {
        clientSettingCache[keyName] = resultValue;
        LocaleTableHandler.draw(keyName);
    });
};

LocaleTableHandler.draw = function(keyName) {
    var parentDiv = clientSettingCache[keyName + "_parentDiv"];
    var regExPattern = clientSettingCache[keyName + "_regExPattern"];
    var syntax = clientSettingCache[keyName + "_syntax"];

    require(["dojo/parser","dijit/form/Button","dijit/form/Textarea","dijit/form/ValidationTextBox"],function(dojoParser){
        var resultValue = clientSettingCache[keyName];
        clearDivElements(parentDiv, false);
        for (var i in resultValue) {
            LocaleTableHandler.addLocaleTableRow(parentDiv, keyName, i, resultValue[i], regExPattern, syntax)
        }
        addAddLocaleButtonRow(parentDiv, keyName, function() {
            LocaleTableHandler.addLocaleSetting(keyName, parentDiv, regExPattern, syntax);
        });

        clientSettingCache[keyName] = resultValue;
        dojoParser.parse(parentDiv);
    });
};

LocaleTableHandler.addLocaleTableRow = function(parentDiv, settingKey, localeString, value, regExPattern, syntax) {
    var inputID = 'value-' + settingKey + '-' + localeString;

    // clear the old dijit node (if it exists)
    PWM_MAIN.clearDijitWidget(inputID);

    var newTableRow = document.createElement("tr");
    newTableRow.setAttribute("style", "border-width: 0");
    {
        var td1 = document.createElement("td");
        td1.setAttribute("style", "border-width: 0; width: 15px");

        if (localeString == null || localeString.length < 1) {
            td1.innerHTML = "";
        } else {
            td1.innerHTML = localeString;
        }
        newTableRow.appendChild(td1);

    }
    {
        var td2 = document.createElement("td");
        td2.setAttribute("style", "border-width: 0");
        if (syntax == 'LOCALIZED_TEXT_AREA') {
            var textAreaElement = document.createElement("textarea");
            textAreaElement.setAttribute("id", inputID);
            textAreaElement.setAttribute("value", PWM_STRINGS['Display_PleaseWait']);
            textAreaElement.setAttribute("onchange", "LocaleTableHandler.writeLocaleSetting('" + settingKey + "','" + localeString + "',this.value)");
            textAreaElement.setAttribute("style", "width: 520px;");
            textAreaElement.setAttribute("data-dojo-type", "dijit.form.Textarea");
            textAreaElement.setAttribute("value", value);
            td2.appendChild(textAreaElement);
        } else {
            var inputElement = document.createElement("input");
            inputElement.setAttribute("id", inputID);
            inputElement.setAttribute("value", PWM_STRINGS['Display_PleaseWait']);
            inputElement.setAttribute("onchange", "LocaleTableHandler.writeLocaleSetting('" + settingKey + "','" + localeString + "',this.value)");
            inputElement.setAttribute("style", "width: 520px");
            inputElement.setAttribute("data-dojo-type", "dijit.form.ValidationTextBox");
            inputElement.setAttribute("regExp", regExPattern);
            inputElement.setAttribute("value", value);
            td2.appendChild(inputElement);
        }
        newTableRow.appendChild(td2);

        if (localeString != null && localeString.length > 0) {
            var imgElement = document.createElement("img");
            imgElement.setAttribute("style", "width: 10px; height: 10px");
            imgElement.setAttribute("src", PWM_GLOBAL['url-resources'] + "/redX.png");
            imgElement.setAttribute("onclick", "LocaleTableHandler.removeLocaleSetting('" + settingKey + "','" + localeString + "','" + parentDiv + "','" + regExPattern + "','" + syntax + "')");
            td2.appendChild(imgElement);
        }
    }
    var parentDivElement = PWM_MAIN.getObject(parentDiv);
    parentDivElement.appendChild(newTableRow);
};

LocaleTableHandler.writeLocaleSetting = function(settingKey, locale, value) {
    var existingValues = clientSettingCache[settingKey];
    var currentValues = { };
    for (var i in existingValues) {
        var inputID = 'value-' + settingKey + '-' + i;
        currentValues[i] = PWM_MAIN.getObject(inputID).value;
    }
    if (value == null) {
        delete currentValues[locale];
    } else {
        currentValues[locale] = value;
    }
    writeSetting(settingKey, currentValues);
    clientSettingCache[settingKey] = currentValues;
};

LocaleTableHandler.removeLocaleSetting = function(keyName, locale, parentDiv, regExPattern, syntax) {
    LocaleTableHandler.writeLocaleSetting(keyName, locale, null);
    LocaleTableHandler.draw(keyName);
};

LocaleTableHandler.addLocaleSetting = function(keyName, parentDiv, regExPattern, syntax) {
    require(["dijit/registry"],function(registry){
        var inputValue = registry.byId(keyName + '-addLocaleValue').value;
        try {
            var existingElementForLocale = PWM_MAIN.getObject('value-' + keyName + '-' + inputValue);
            if (existingElementForLocale == null) {
                LocaleTableHandler.writeLocaleSetting(keyName, inputValue, '');
                LocaleTableHandler.draw(keyName);
            }
        } finally {
        }
    });
};

// -------------------------- multivalue table handler ------------------------------------

var MultiTableHandler = {};

MultiTableHandler.initMultiTable = function(parentDiv, keyName, regExPattern) {
    console.log('MultiTableHandler init for ' + keyName);
    clearDivElements(parentDiv, true);
    readSetting(keyName, function(resultValue) {
        clientSettingCache[keyName] = resultValue;
        MultiTableHandler.draw(parentDiv, keyName, regExPattern);
    });
};


MultiTableHandler.draw = function(parentDiv, keyName, regExPattern) {
    clearDivElements(parentDiv, false);
    var resultValue = clientSettingCache[keyName];
    var counter = 0;
    for (var i in resultValue) {
        MultiTableHandler.addMultiValueRow(parentDiv, keyName, i, resultValue[i], regExPattern);
        counter++;
    }
    {
        var newTableRow = document.createElement("tr");
        newTableRow.setAttribute("style", "border-width: 0");
        newTableRow.setAttribute("colspan", "5");

        var newTableData = document.createElement("td");
        newTableData.setAttribute("style", "border-width: 0;");

        var addItemButton = document.createElement("button");
        addItemButton.setAttribute("type", "[button");
        addItemButton.setAttribute("onclick", "MultiTableHandler.addMultiSetting('" + keyName + "','" + parentDiv + "','" + regExPattern + "');");
        addItemButton.setAttribute("data-dojo-type", "dijit.form.Button");
        addItemButton.innerHTML = "Add Value";
        newTableData.appendChild(addItemButton);

        newTableRow.appendChild(newTableData);
        var parentDivElement = PWM_MAIN.getObject(parentDiv);
        parentDivElement.appendChild(newTableRow);
    }
    require(["dojo/parser","dijit/form/Button","dijit/form/Textarea","dijit/form/ValidationTextBox"],function(dojoParser){
        dojoParser.parse(parentDiv);
    });
};

MultiTableHandler.addMultiValueRow = function(parentDiv, settingKey, iteration, value, regExPattern) {
    require(["dijit/registry"],function(registry){
        var inputID = 'value-' + settingKey + '-' + iteration;

        // clear the old dijit node (if it exists)
        var oldDijitNode = registry.byId(inputID);
        if (oldDijitNode != null) {
            try {
                oldDijitNode.destroy();
            } catch (error) {
            }
        }

        var newTableRow = document.createElement("tr");
        newTableRow.setAttribute("style", "border-width: 0");
        {
            var td1 = document.createElement("td");
            td1.setAttribute("width", "100%");
            td1.setAttribute("style", "border-width: 0;");


            var inputElement = document.createElement("input");
            inputElement.setAttribute("id", inputID);
            inputElement.setAttribute("value", value);
            inputElement.setAttribute("onchange", "MultiTableHandler.writeMultiSetting('" + settingKey + "','" + iteration + "',this.value)");
            inputElement.setAttribute("style", "width: 550px");
            inputElement.setAttribute("data-dojo-type", "dijit.form.ValidationTextBox");
            inputElement.setAttribute("regExp", regExPattern);
            inputElement.setAttribute("invalidMessage", "The value does not have the correct format.");
            td1.appendChild(inputElement);
            newTableRow.appendChild(td1);


            if (PWM_MAIN.itemCount(clientSettingCache[settingKey]) > 1) {
                var imgElement = document.createElement("img");
                imgElement.setAttribute("style", "width: 10px; height: 10px");
                imgElement.setAttribute("src", PWM_GLOBAL['url-resources'] + "/redX.png");
                imgElement.setAttribute("onclick", "MultiTableHandler.removeMultiSetting('" + settingKey + "','" + iteration + "','" + regExPattern + "')");
                td1.appendChild(imgElement);
            }
        }
        var parentDivElement = PWM_MAIN.getObject(parentDiv);
        parentDivElement.appendChild(newTableRow);
    });
};

MultiTableHandler.writeMultiSetting = function(settingKey, iteration, value) {
    var currentValues = clientSettingCache[settingKey];
    if (value == null) {
        delete currentValues[iteration];
    } else {
        currentValues[iteration] = value;
    }
    writeSetting(settingKey, currentValues);
};

MultiTableHandler.removeMultiSetting = function(keyName, iteration, regExPattern) {
    var parentDiv = 'table_setting_' + keyName;
    MultiTableHandler.writeMultiSetting(keyName, iteration, null);
    MultiTableHandler.draw(parentDiv, keyName, regExPattern);
};

MultiTableHandler.addMultiSetting = function(keyName, parentDiv, regExPattern) {
    clientSettingCache[keyName].push("");
    writeSetting(keyName, clientSettingCache[keyName]);
    MultiTableHandler.draw(parentDiv, keyName, regExPattern)
};

// -------------------------- multi locale table handler ------------------------------------

var MultiLocaleTableHandler = {};

MultiLocaleTableHandler.initMultiLocaleTable = function(parentDiv, keyName, regExPattern) {
    console.log('MultiLocaleTableHandler init for ' + keyName);
    clearDivElements(parentDiv, true);
    readSetting(keyName, function(resultValue) {
        clientSettingCache[keyName] = resultValue;
        MultiLocaleTableHandler.draw(parentDiv, keyName, regExPattern);
    });
};

MultiLocaleTableHandler.draw = function(parentDiv, keyName, regExPattern) {
    var resultValue = clientSettingCache[keyName];
    require(["dojo","dijit/registry","dojo/parser","dijit/form/Button","dijit/form/ValidationTextBox","dijit/form/Textarea","dijit/registry"],function(dojo,registry,dojoParser){
        clearDivElements(parentDiv, false);
        for (var localeName in resultValue) {
            var localeTableRow = document.createElement("tr");
            localeTableRow.setAttribute("style", "border-width: 0;");

            var localeTdName = document.createElement("td");
            localeTdName.setAttribute("style", "border-width: 0; width:15px");
            localeTdName.innerHTML = localeName;
            localeTableRow.appendChild(localeTdName);

            var localeTdContent = document.createElement("td");
            localeTdContent.setAttribute("style", "border-width: 0; width: 525px");
            localeTableRow.appendChild(localeTdContent);

            var localeTableElement = document.createElement("table");
            localeTableElement.setAttribute("style", "border-width: 2px; width:525px; margin:0");
            localeTdContent.appendChild(localeTableElement);

            var multiValues = resultValue[localeName];

            for (var iteration in multiValues) {

                var valueTableRow = document.createElement("tr");

                var valueTd1 = document.createElement("td");
                valueTd1.setAttribute("style", "border-width: 0;");

                // clear the old dijit node (if it exists)
                var inputID = "value-" + keyName + "-" + localeName + "-" + iteration;
                var oldDijitNode = registry.byId(inputID);
                if (oldDijitNode != null) {
                    try {
                        oldDijitNode.destroy();
                    } catch (error) {
                    }
                }

                var inputElement = document.createElement("input");
                inputElement.setAttribute("id", inputID);
                inputElement.setAttribute("value", multiValues[iteration]);
                inputElement.setAttribute("onchange", "MultiLocaleTableHandler.writeMultiLocaleSetting('" + keyName + "','" + localeName + "','" + iteration + "',this.value,'" + regExPattern + "')");
                inputElement.setAttribute("style", "width: 490px");
                inputElement.setAttribute("data-dojo-type", "dijit.form.ValidationTextBox");
                inputElement.setAttribute("regExp", regExPattern);
                inputElement.setAttribute("invalidMessage", "The value does not have the correct format.");
                valueTd1.appendChild(inputElement);
                valueTableRow.appendChild(valueTd1);
                localeTableElement.appendChild(valueTableRow);

                // add remove button
                var imgElement = document.createElement("div");
                imgElement.setAttribute("style", "width: 10px; height: 10px;");
                imgElement.setAttribute("class", "fa fa-times icon_button");
                imgElement.setAttribute("onclick", "MultiLocaleTableHandler.writeMultiLocaleSetting('" + keyName + "','" + localeName + "','" + iteration + "',null,'" + regExPattern + "')");
                valueTd1.appendChild(imgElement);
            }

            { // add row button for this locale group
                var newTableRow = document.createElement("tr");
                newTableRow.setAttribute("style", "border-width: 0");
                newTableRow.setAttribute("colspan", "5");

                var newTableData = document.createElement("td");
                newTableData.setAttribute("style", "border-width: 0;");

                var addItemButton = document.createElement("button");
                addItemButton.setAttribute("type", "[button");
                addItemButton.setAttribute("onclick", "clientSettingCache['" + keyName + "']['" + localeName + "'].push('');MultiLocaleTableHandler.writeMultiLocaleSetting('" + keyName + "',null,null,null,'" + regExPattern + "')");
                addItemButton.setAttribute("data-dojo-type", "dijit.form.Button");
                addItemButton.innerHTML = "Add Value";
                newTableData.appendChild(addItemButton);

                newTableRow.appendChild(newTableData);
                localeTableElement.appendChild(newTableRow);
            }


            if (localeName != '') { // add remove locale x
                var imgElement2 = document.createElement("div");
                imgElement2.setAttribute("style", "width: 12px; height: 12px;");
                imgElement2.setAttribute("class", "fa fa-times icon_button");
                imgElement2.setAttribute("onclick", "MultiLocaleTableHandler.writeMultiLocaleSetting('" + keyName + "','" + localeName + "',null,null,'" + regExPattern + "')");
                var tdElement = document.createElement("td");
                tdElement.setAttribute("style", "border-width: 0; text-align: left; vertical-align: top;width 10px");

                localeTableRow.appendChild(tdElement);
                tdElement.appendChild(imgElement2);
            }

            var parentDivElement = PWM_MAIN.getObject(parentDiv);
            parentDivElement.appendChild(localeTableRow);

            { // add a spacer row
                var spacerTableRow = document.createElement("tr");
                spacerTableRow.setAttribute("style", "border-width: 0");
                parentDivElement.appendChild(spacerTableRow);

                var spacerTableData = document.createElement("td");
                spacerTableData.setAttribute("style", "border-width: 0");
                spacerTableData.innerHTML = "&nbsp;";
                spacerTableRow.appendChild(spacerTableData);
            }
        }

        var addLocaleFunction = function() {
            require(["dijit/registry"],function(registry){
                MultiLocaleTableHandler.writeMultiLocaleSetting(keyName, registry.byId(keyName + "-addLocaleValue").value, 0, '', regExPattern);
            });
        };

        addAddLocaleButtonRow(parentDiv, keyName, addLocaleFunction);
        clientSettingCache[keyName] = resultValue;
        dojoParser.parse(parentDiv);
    });
};

MultiLocaleTableHandler.writeMultiLocaleSetting = function(settingKey, locale, iteration, value, regExPattern) {
    if (locale != null) {
        if (clientSettingCache[settingKey][locale] == null) {
            clientSettingCache[settingKey][locale] = [ "" ];
        }

        if (iteration == null) {
            delete clientSettingCache[settingKey][locale];
        } else {
            if (value == null) {
                clientSettingCache[settingKey][locale].splice(iteration,1);
            } else {
                clientSettingCache[settingKey][locale][iteration] = value;
            }
        }
    }

    writeSetting(settingKey, clientSettingCache[settingKey]);
    var parentDiv = 'table_setting_' + settingKey;
    MultiLocaleTableHandler.draw(parentDiv, settingKey, regExPattern);
};

// -------------------------- form table handler ------------------------------------

var FormTableHandler = {};

FormTableHandler.init = function(keyName,options) {
    console.log('FormTableHandler init for ' + keyName);
    var parentDiv = 'table_setting_' + keyName;
    clientSettingCache[keyName + '_options'] = options;
    clearDivElements(parentDiv, true);
    readSetting(keyName, function(resultValue) {
        clientSettingCache[keyName] = resultValue;
        FormTableHandler.redraw(keyName);
    });
};

FormTableHandler.redraw = function(keyName) {
    var resultValue = clientSettingCache[keyName];
    var parentDiv = 'table_setting_' + keyName;
    clearDivElements(parentDiv, false);
    var parentDivElement = PWM_MAIN.getObject(parentDiv);

    if (!PWM_MAIN.isEmpty(resultValue)) {
        var headerRow = document.createElement("tr");
        headerRow.setAttribute("style", "border-width: 0");

        var header1 = document.createElement("td");
        header1.setAttribute("style", "border-width: 0;");
        header1.innerHTML = "Name";
        headerRow.appendChild(header1);

        var header2 = document.createElement("td");
        header2.setAttribute("style", "border-width: 0;");
        header2.innerHTML = "Label";
        headerRow.appendChild(header2);

        parentDivElement.appendChild(headerRow);
    }

    for (var i in resultValue) {
        FormTableHandler.drawRow(parentDiv, keyName, i, resultValue[i]);
    }

    {
        var newTableRow = document.createElement("tr");
        newTableRow.setAttribute("style", "border-width: 0");
        newTableRow.setAttribute("colspan", "5");

        var newTableData = document.createElement("td");
        newTableData.setAttribute("style", "border-width: 0;");

        var addItemButton = document.createElement("button");
        addItemButton.setAttribute("type", "button");
        addItemButton.setAttribute("onclick", "FormTableHandler.addMultiSetting('" + keyName + "','" + parentDiv + "');");
        addItemButton.setAttribute("data-dojo-type", "dijit.form.Button");
        addItemButton.innerHTML = "Add Value";
        newTableData.appendChild(addItemButton);

        newTableRow.appendChild(newTableData);
        parentDivElement.appendChild(newTableRow);
    }
    require(["dojo/parser","dijit/form/Button","dijit/form/Select"],function(dojoParser){
        dojoParser.parse(parentDiv);
    });
};

FormTableHandler.drawRow = function(parentDiv, settingKey, iteration, value) {
    var inputID = 'value_' + settingKey + '_' + iteration + "_";

    // clear the old dijit node (if it exists)
    PWM_MAIN.clearDijitWidget(inputID + "name");
    PWM_MAIN.clearDijitWidget(inputID + "label");
    PWM_MAIN.clearDijitWidget(inputID + "type");
    PWM_MAIN.clearDijitWidget(inputID + "optionsButton");

    var newTableRow = document.createElement("tr");
    newTableRow.setAttribute("style", "border-width: 0");
    {
        {
            var td1 = document.createElement("td");
            td1.setAttribute("style", "border-width: 0");
            var nameInput = document.createElement("input");
            nameInput.setAttribute("id", inputID + "name");
            nameInput.setAttribute("value", value['name']);
            nameInput.setAttribute("onchange","clientSettingCache['" + settingKey + "'][" + iteration + "]['name'] = this.value;FormTableHandler.writeFormSetting('" + settingKey + "')");
            nameInput.setAttribute("data-dojo-type", "dijit.form.ValidationTextBox");
            nameInput.setAttribute("data-dojo-props", "required: true");

            td1.appendChild(nameInput);
            newTableRow.appendChild(td1);
        }

        {
            var td2 = document.createElement("td");
            td2.setAttribute("style", "border-width: 0");
            var labelInput = document.createElement("input");
            labelInput.setAttribute("id", inputID + "label");
            labelInput.setAttribute("value", value['labels']['']);
            labelInput.setAttribute("readonly", "true");
            labelInput.setAttribute("onclick","FormTableHandler.showLabelDialog('" + settingKey + "'," + iteration + ")");
            labelInput.setAttribute("onkeypress","FormTableHandler.showLabelDialog('" + settingKey + "'," + iteration + ")");
            labelInput.setAttribute("data-dojo-type", "dijit.form.ValidationTextBox");
            td2.appendChild(labelInput);
            newTableRow.appendChild(td2);
        }

        {
            var td3 = document.createElement("td");
            td3.setAttribute("style", "border-width: 0");
            var optionList = PWM_GLOBAL['formTypeOptions'];
            var typeSelect = document.createElement("select");
            typeSelect.setAttribute("data-dojo-type", "dijit.form.Select");
            typeSelect.setAttribute("id", inputID + "type");
            typeSelect.setAttribute("style","width: 80px");
            typeSelect.setAttribute("onchange","clientSettingCache['" + settingKey + "'][" + iteration + "]['type'] = this.value;FormTableHandler.writeFormSetting('" + settingKey + "')");
            for (var optionItem in optionList) {
                var optionElement = document.createElement("option");
                optionElement.value = optionList[optionItem];
                optionElement.innerHTML = optionList[optionItem];
                if (optionList[optionItem] == clientSettingCache[settingKey][iteration]['type']) {
                    optionElement.setAttribute("selected","true");
                }
                typeSelect.appendChild(optionElement);
            }

            td3.appendChild(typeSelect);
            newTableRow.appendChild(td3);
        }

        {
            var td4 = document.createElement("td");
            td4.setAttribute("style", "border-width: 0");
            var labelButton = document.createElement("button");
            labelButton.setAttribute("id", inputID + "optionsButton");
            labelButton.setAttribute("data-dojo-type", "dijit.form.Button");
            labelButton.setAttribute("onclick","FormTableHandler.showOptionsDialog('" + settingKey + "'," + iteration + ")");
            labelButton.innerHTML = "Options";
            td4.appendChild(labelButton);
            newTableRow.appendChild(td4);
        }

        {
            var tdFinal = document.createElement("td");
            tdFinal.setAttribute("style", "border-width: 0");

            var imgElement = document.createElement("img");
            imgElement.setAttribute("style", "width: 10px; height: 10px");
            imgElement.setAttribute("src", PWM_GLOBAL['url-resources'] + "/redX.png");
            imgElement.setAttribute("onclick", "FormTableHandler.removeMultiSetting('" + settingKey + "','" + iteration + "')");
            tdFinal.appendChild(imgElement);
            newTableRow.appendChild(tdFinal);
        }
    }
    var parentDivElement = PWM_MAIN.getObject(parentDiv);
    parentDivElement.appendChild(newTableRow);
};

FormTableHandler.writeFormSetting = function(settingKey) {
    var cachedSetting = clientSettingCache[settingKey];
    writeSetting(settingKey, cachedSetting);
};

FormTableHandler.removeMultiSetting = function(keyName, iteration) {
    delete clientSettingCache[keyName][iteration];
    FormTableHandler.writeFormSetting(keyName);
    FormTableHandler.redraw(keyName);
};

FormTableHandler.addMultiSetting = function(keyName) {
    var currentSize = 0;
    for (var loopVar in clientSettingCache[keyName]) {
        currentSize++;
    }
    clientSettingCache[keyName][currentSize + 1] = {};
    clientSettingCache[keyName][currentSize + 1]['name'] = '';
    clientSettingCache[keyName][currentSize + 1]['minimumLength'] = '0';
    clientSettingCache[keyName][currentSize + 1]['maximumLength'] = '255';
    clientSettingCache[keyName][currentSize + 1]['labels'] = {};
    clientSettingCache[keyName][currentSize + 1]['labels'][''] = '';
    clientSettingCache[keyName][currentSize + 1]['regexErrors'] = {};
    clientSettingCache[keyName][currentSize + 1]['regexErrors'][''] = '';
    clientSettingCache[keyName][currentSize + 1]['selectOptions'] = {};
    clientSettingCache[keyName][currentSize + 1]['selectOptions'][''] = '';
    clientSettingCache[keyName][currentSize + 1]['description'] = {};
    clientSettingCache[keyName][currentSize + 1]['description'][''] = '';
    FormTableHandler.writeFormSetting(keyName);
    FormTableHandler.redraw(keyName)
};

FormTableHandler.showOptionsDialog = function(keyName, iteration) {
    require(["dijit/Dialog","dijit/form/Textarea","dijit/form/CheckBox","dijit/form/NumberSpinner"],function(){
        var inputID = 'value_' + keyName + '_' + iteration + "_";
        var bodyText = '<table style="border:0">';
        bodyText += '<tr>';
        bodyText += '<td style="border:0; text-align: right">Description</td><td style="border:0;"><input type="text" id="' + inputID + 'description' + '"/></td>';
        bodyText += '</tr><tr>';
        bodyText += '<td style="border:0; text-align: right">Required</td><td style="border:0;"><input type="checkbox" id="' + inputID + 'required' + '"/></td>';
        bodyText += '</tr><tr>';
        bodyText += '<td style="border:0; text-align: right">Confirm</td><td style="border:0;"><input type="checkbox" id="' + inputID + 'confirmationRequired' + '"/></td>';
        bodyText += '</tr><tr>';
        if (clientSettingCache[keyName + '_options']['readonly'] == 'show') {
            bodyText += '<td style="border:0; text-align: right">Read Only</td><td style="border:0;"><input type="checkbox" id="' + inputID + 'readonly' + '"/></td>';
            bodyText += '</tr><tr>';
        }
        if (clientSettingCache[keyName + '_options']['unique'] == 'show') {
            bodyText += '<td style="border:0; text-align: right">Unique</td><td style="border:0;"><input type="checkbox" id="' + inputID + 'unique' + '"/></td>';
            bodyText += '</tr><tr>';
        }
        bodyText += '<td style="border:0; text-align: right">Minimum Length</td><td style="border:0;"><input type="number" id="' + inputID + 'minimumLength' + '"/></td>';
        bodyText += '</tr><tr>';
        bodyText += '<td style="border:0; text-align: right">Maximum Length</td><td style="border:0;"><input type="number" id="' + inputID + 'maximumLength' + '"/></td>';
        bodyText += '</tr><tr>';
        bodyText += '<td style="border:0; text-align: right">Regular Expression</td><td style="border:0;"><input type="text" id="' + inputID + 'regex' + '"/></td>';
        bodyText += '</tr><tr>';
        bodyText += '<td style="border:0; text-align: right">Regular Expression<br/>Error Message</td><td style="border:0;"><input type="text" id="' + inputID + 'regexErrors' + '"/></td>';
        bodyText += '</tr><tr>';
        bodyText += '<td style="border:0; text-align: right">Placeholder</td><td style="border:0;"><input type="text" id="' + inputID + 'placeholder' + '"/></td>';
        bodyText += '</tr><tr>';
        bodyText += '<td style="border:0; text-align: right">JavaScript</td><td style="border:0;"><input type="text" id="' + inputID + 'javascript' + '"/></td>';
        bodyText += '</tr><tr>';
        if (clientSettingCache[keyName][iteration]['type'] == 'select') {
            bodyText += '<td style="border:0; text-align: right">Select Options</td><td style="border:0;"><input class="menubutton" type="button" id="' + inputID + 'selectOptions' + '" value="Edit" onclick="FormTableHandler.showSelectOptionsDialog(\'' + keyName + '\',\'' + iteration + '\')"/></td>';
            bodyText += '</tr>';
        }
        bodyText += '</table>';
        bodyText += '<br/>';
        bodyText += '<button class="btn" onclick="PWM_MAIN.clearDijitWidget(\'dialogPopup\');FormTableHandler.redraw(\'' + keyName + '\')">OK</button>';

        PWM_MAIN.clearDijitWidget('dialogPopup');
        var theDialog = new dijit.Dialog({
            id: 'dialogPopup',
            title: 'Options for ' + clientSettingCache[keyName][iteration]['name'],
            style: "width: 450px",
            content: bodyText,
            hide: function(){
                PWM_MAIN.clearDijitWidget('dialogPopup');
                FormTableHandler.redraw(keyName);
            }
        });
        theDialog.show();

        PWM_MAIN.clearDijitWidget(inputID + "description");
        new dijit.form.Textarea({
            value: clientSettingCache[keyName][iteration]['description'][''],
            readonly: true,
            onClick: function(){FormTableHandler.showDescriptionDialog(keyName,iteration);},
            onKeyPress: function(){FormTableHandler.showDescriptionDialog(keyName,iteration);}
        },inputID + "description");

        PWM_MAIN.clearDijitWidget(inputID + "required");
        new dijit.form.CheckBox({
            checked: clientSettingCache[keyName][iteration]['required'],
            onChange: function(){clientSettingCache[keyName][iteration]['required'] = this.checked;FormTableHandler.writeFormSetting(keyName)}
        },inputID + "required");

        PWM_MAIN.clearDijitWidget(inputID + "confirmationRequired");
        new dijit.form.CheckBox({
            checked: clientSettingCache[keyName][iteration]['confirmationRequired'],
            onChange: function(){clientSettingCache[keyName][iteration]['confirmationRequired'] = this.checked;FormTableHandler.writeFormSetting(keyName)}
        },inputID + "confirmationRequired");

        if (clientSettingCache[keyName + '_options']['readonly'] == 'show') {
            PWM_MAIN.clearDijitWidget(inputID + "readonly");
            new dijit.form.CheckBox({
                checked: clientSettingCache[keyName][iteration]['readonly'],
                onChange: function(){clientSettingCache[keyName][iteration]['readonly'] = this.checked;FormTableHandler.writeFormSetting(keyName)}
            },inputID + "readonly");
        }

        if (clientSettingCache[keyName + '_options']['unique'] == 'show') {
            PWM_MAIN.clearDijitWidget(inputID + "unique");
            new dijit.form.CheckBox({
                checked: clientSettingCache[keyName][iteration]['unique'],
                onChange: function(){clientSettingCache[keyName][iteration]['unique'] = this.checked;FormTableHandler.writeFormSetting(keyName)}
            },inputID + "unique");
        }

        PWM_MAIN.clearDijitWidget(inputID + "minimumLength");
        new dijit.form.NumberSpinner({
            value: clientSettingCache[keyName][iteration]['minimumLength'],
            onChange: function(){clientSettingCache[keyName][iteration]['minimumLength'] = this.value;FormTableHandler.writeFormSetting(keyName)},
            constraints: { min:0, max:5000 },
            style: "width: 70px"
        },inputID + "minimumLength");

        PWM_MAIN.clearDijitWidget(inputID + "maximumLength");
        new dijit.form.NumberSpinner({
            value: clientSettingCache[keyName][iteration]['maximumLength'],
            onChange: function(){clientSettingCache[keyName][iteration]['maximumLength'] = this.value;FormTableHandler.writeFormSetting(keyName)},
            constraints: { min:0, max:5000 },
            style: "width: 70px"
        },inputID + "maximumLength");

        PWM_MAIN.clearDijitWidget(inputID + "regex");
        new dijit.form.Textarea({
            value: clientSettingCache[keyName][iteration]['regex'],
            onChange: function(){clientSettingCache[keyName][iteration]['regex'] = this.value;FormTableHandler.writeFormSetting(keyName)}
        },inputID + "regex");

        PWM_MAIN.clearDijitWidget(inputID + "regexErrors");
        new dijit.form.Textarea({
            value: clientSettingCache[keyName][iteration]['regexErrors'][''],
            readonly: true,
            onClick: function(){FormTableHandler.showRegexErrorsDialog(keyName,iteration);},
            onKeyPress: function(){FormTableHandler.showRegexErrorsDialog(keyName,iteration);}
        },inputID + "regexErrors");

        PWM_MAIN.clearDijitWidget(inputID + "placeholder");
        new dijit.form.Textarea({
            value: clientSettingCache[keyName][iteration]['placeholder'],
            onChange: function(){clientSettingCache[keyName][iteration]['placeholder'] = this.value;FormTableHandler.writeFormSetting(keyName)}
        },inputID + "placeholder");

        PWM_MAIN.clearDijitWidget(inputID + "javascript");
        new dijit.form.Textarea({
            value: clientSettingCache[keyName][iteration]['javascript'],
            onChange: function(){clientSettingCache[keyName][iteration]['javascript'] = this.value;FormTableHandler.writeFormSetting(keyName)}
        },inputID + "javascript");
    });
};

FormTableHandler.showLabelDialog = function(keyName, iteration) {
    require(["dijit/Dialog","dijit/form/Textarea","dijit/form/CheckBox"],function(){
        var inputID = 'value_' + keyName + '_' + iteration + "_" + "label_";
        var bodyText = '<table style="border:0" id="' + inputID + 'table">';
        bodyText += '<tr>';
        for (var localeName in clientSettingCache[keyName][iteration]['labels']) {
            var value = clientSettingCache[keyName][iteration]['labels'][localeName];
            var localeID = inputID + localeName;
            bodyText += '<td style="border:0; text-align: right">' + localeName + '</td><td style="border:0;"><input type="text" value="' + value + '" id="' + localeID + '' + '"/></td>';
            if (localeName != '') {
                bodyText += '<td style="border:0">';
                bodyText += '<img id="' + localeID + '-removeButton' + '" alt="crossMark" height="15" width="15" src="' + PWM_GLOBAL['url-resources'] + '/redX.png"';
                bodyText += ' onclick="FormTableHandler.removeLocaleLabel(\'' + keyName + '\',' + iteration + ',\'' + localeName + '\')" />';
                bodyText += '</td>';
            }
            bodyText += '</tr><tr>';
        }
        bodyText += '</tr></table>';
        bodyText += '<br/>';
        bodyText += '<button class="btn" onclick="PWM_MAIN.clearDijitWidget(\'dialogPopup\');FormTableHandler.redraw(\'' + keyName + '\')">OK</button>';

        PWM_MAIN.clearDijitWidget('dialogPopup');
        var theDialog = new dijit.Dialog({
            id: 'dialogPopup',
            title: 'Label for ' + clientSettingCache[keyName][iteration]['name'],
            style: "width: 450px",
            content: bodyText,
            hide: function(){
                PWM_MAIN.clearDijitWidget('dialogPopup');
                FormTableHandler.redraw(keyName);
            }
        });
        theDialog.show();

        for (var localeName in clientSettingCache[keyName][iteration]['labels']) {
            var value = clientSettingCache[keyName][iteration]['labels'][localeName];
            var loopID = inputID + localeName;
            PWM_MAIN.clearDijitWidget(loopID);
            new dijit.form.Textarea({
                onChange: function(){clientSettingCache[keyName][iteration]['labels'][localeName] = this.value;FormTableHandler.writeFormSetting(keyName)}
            },loopID);

        }

        var addLocaleFunction = function() {
            require(["dijit/registry"],function(registry){
                FormTableHandler.addLocaleLabel(keyName, iteration, registry.byId(inputID + "-addLocaleValue").value);
            });
        };

        addAddLocaleButtonRow(inputID + 'table', inputID, addLocaleFunction);
    });
};

FormTableHandler.addLocaleLabel = function(keyName, iteration, localeName) {
    clientSettingCache[keyName][iteration]['labels'][localeName] = '';
    FormTableHandler.writeFormSetting(keyName);
    FormTableHandler.showLabelDialog(keyName, iteration)
};

FormTableHandler.removeLocaleLabel = function(keyName, iteration, localeName) {
    delete clientSettingCache[keyName][iteration]['labels'][localeName];
    FormTableHandler.writeFormSetting(keyName);
    FormTableHandler.showLabelDialog(keyName, iteration)
};

FormTableHandler.showRegexErrorsDialog = function(keyName, iteration) {
    require(["dijit/Dialog","dijit/form/Textarea"],function(){
        var inputID = 'value_' + keyName + '_' + iteration + "_" + "regexErrors_";

        var bodyText = '';
        bodyText += '<p>Error Message to show when the regular expression constraint is violated.</p>';
        bodyText += '<table style="border:0" id="' + inputID + 'table">';
        bodyText += '<tr>';
        for (var localeName in clientSettingCache[keyName][iteration]['regexErrors']) {
            var value = clientSettingCache[keyName][iteration]['regexErrors'][localeName];
            var localeID = inputID + localeName;
            bodyText += '<td style="border:0; text-align: right">' + localeName + '</td><td style="border:0;"><input type="text" value="' + value + '" id="' + localeID + '' + '"/></td>';
            if (localeName != '') {
                bodyText += '<td style="border:0">';
                bodyText += '<img id="' + localeID + '-removeButton' + '" alt="crossMark" height="15" width="15" src="' + PWM_GLOBAL['url-resources'] + '/redX.png"';
                bodyText += ' onclick="FormTableHandler.removeRegexErrorLocale(\'' + keyName + '\',' + iteration + ',\'' + localeName + '\')" />';
                bodyText += '</td>';
            }
            bodyText += '</tr><tr>';
        }
        bodyText += '</tr></table>';
        bodyText += '<br/>';
        bodyText += '<button class="btn" onclick="PWM_MAIN.clearDijitWidget(\'dialogPopup\');FormTableHandler.showOptionsDialog(\'' + keyName + '\',\'' + iteration + '\')">OK</button>';

        PWM_MAIN.clearDijitWidget('dialogPopup');
        var theDialog = new dijit.Dialog({
            id: 'dialogPopup',
            title: 'Regular Expression Error Message for ' + clientSettingCache[keyName][iteration]['name'],
            style: "width: 450px",
            content: bodyText,
            hide: function(){
                PWM_MAIN.clearDijitWidget('dialogPopup');
                FormTableHandler.showOptionsDialog(keyName,iteration);
            }
        });
        theDialog.show();

        for (var localeName in clientSettingCache[keyName][iteration]['regexErrors']) {
            var value = clientSettingCache[keyName][iteration]['regexErrors'][localeName];
            var loopID = inputID + localeName;
            PWM_MAIN.clearDijitWidget(loopID);
            new dijit.form.Textarea({
                onChange: function(){clientSettingCache[keyName][iteration]['regexErrors'][localeName] = this.value;FormTableHandler.writeFormSetting(keyName)}
            },loopID);

        }

        var addLocaleFunction = function() {
            require(["dijit/registry"],function(registry){
                FormTableHandler.addRegexErrorLocale(keyName, iteration, registry.byId(inputID + "-addLocaleValue").value);
            });
        };

        addAddLocaleButtonRow(inputID + 'table', inputID, addLocaleFunction);
    });
};

FormTableHandler.addRegexErrorLocale = function(keyName, iteration, localeName) {
    clientSettingCache[keyName][iteration]['regexErrors'][localeName] = '';
    FormTableHandler.writeFormSetting(keyName);
    FormTableHandler.showRegexErrorsDialog(keyName, iteration);
};

FormTableHandler.removeRegexErrorLocale = function(keyName, iteration, localeName) {
    delete clientSettingCache[keyName][iteration]['regexErrors'][localeName];
    FormTableHandler.writeFormSetting(keyName);
    FormTableHandler.showRegexErrorsDialog(keyName, iteration);
};

FormTableHandler.showSelectOptionsDialog = function(keyName, iteration) {
    require(["dijit/Dialog","dijit/form/ValidationTextBox","dijit/form/Button","dijit/form/TextBox"],function(Dialog,ValidationTextBox,Button,TextBox){
        var inputID = 'value_' + keyName + '_' + iteration + "_" + "selectOptions_";

        var bodyText = '';
        bodyText += '<table style="border:0" id="' + inputID + 'table">';
        bodyText += '<tr>';
        bodyText += '<td style="border:0"><b>Name</b></td><td style="border:0"><b>Display Value</b></td>';
        bodyText += '</tr><tr>';
        for (var optionName in clientSettingCache[keyName][iteration]['selectOptions']) {
            var value = clientSettingCache[keyName][iteration]['selectOptions'][optionName];
            var optionID = inputID + optionName;
            bodyText += '<td style="border:1px">' + optionName + '</td><td style="border:1px">' + value + '</td>';
            bodyText += '<td style="border:0">';
            bodyText += '<img id="' + optionID + '-removeButton' + '" alt="crossMark" height="15" width="15" src="' + PWM_GLOBAL['url-resources'] + '/redX.png"';
            bodyText += ' onclick="FormTableHandler.removeSelectOptionsOption(\'' + keyName + '\',' + iteration + ',\'' + optionName + '\')" />';
            bodyText += '</td>';
            bodyText += '</tr><tr>';
        }
        bodyText += '</tr></table>';
        bodyText += '<br/>';
        bodyText += '<br/>';
        bodyText += '<input type="text" id="addSelectOptionName"/>';
        bodyText += '<input type="text" id="addSelectOptionValue"/>';
        bodyText += '<input type="button" id="addSelectOptionButton" value="Add"/>';
        bodyText += '<br/>';
        bodyText += '<button class="btn" onclick="FormTableHandler.showOptionsDialog(\'' + keyName + '\',\'' + iteration + '\')">OK</button>';

        PWM_MAIN.clearDijitWidget('dialogPopup');
        var theDialog = new dijit.Dialog({
            id: 'dialogPopup',
            title: 'Select Options for ' + clientSettingCache[keyName][iteration]['name'],
            style: "width: 450px",
            content: bodyText,
            hide: function(){
                PWM_MAIN.clearDijitWidget('dialogPopup');
                FormTableHandler.showOptionsDialog(keyName,iteration);
            }
        });
        theDialog.show();

        for (var optionName in clientSettingCache[keyName][iteration]['selectOptions']) {
            var value = clientSettingCache[keyName][iteration]['selectOptions'][optionName];
            var loopID = inputID + optionName;
            PWM_MAIN.clearDijitWidget(loopID);
            new TextBox({
                onChange: function(){clientSettingCache[keyName][iteration]['selectOptions'][optionName] = this.value;FormTableHandler.writeFormSetting(keyName)}
            },loopID);
        }

        PWM_MAIN.clearDijitWidget("addSelectOptionName");
        new ValidationTextBox({
            placeholder: "Name",
            id: "addSelectOptionName",
            constraints: {min: 1}
        },"addSelectOptionName");

        PWM_MAIN.clearDijitWidget("addSelectOptionValue");
        new ValidationTextBox({
            placeholder: "Display Value",
            id: "addSelectOptionValue",
            constraints: {min: 1}
        },"addSelectOptionValue");

        PWM_MAIN.clearDijitWidget("addSelectOptionButton");
        new Button({
            label: "Add",
            onClick: function() {
                require(["dijit/registry"],function(registry){
                    var name = registry.byId('addSelectOptionName').value;
                    var value = registry.byId('addSelectOptionValue').value;
                    FormTableHandler.addSelectOptionsOption(keyName, iteration, name, value);
                });
            }
        },"addSelectOptionButton");
    });
};

FormTableHandler.addSelectOptionsOption = function(keyName, iteration, optionName, optionValue) {
    if (optionName == null || optionName.length < 1) {
        alert('Name field is required');
        return;
    }

    if (optionValue == null || optionValue.length < 1) {
        alert('Value field is required');
        return;
    }

    clientSettingCache[keyName][iteration]['selectOptions'][optionName] = optionValue;
    FormTableHandler.writeFormSetting(keyName);
    FormTableHandler.showSelectOptionsDialog(keyName, iteration);
};

FormTableHandler.removeSelectOptionsOption = function(keyName, iteration, optionName) {
    delete clientSettingCache[keyName][iteration]['selectOptions'][optionName];
    FormTableHandler.writeFormSetting(keyName);
    FormTableHandler.showSelectOptionsDialog(keyName, iteration);
};

FormTableHandler.showDescriptionDialog = function(keyName, iteration) {
    require(["dijit/Dialog","dijit/form/Textarea"],function(){
        var inputID = 'value_' + keyName + '_' + iteration + "_" + "description_";

        var bodyText = '';
        bodyText += '<table style="border:0" id="' + inputID + 'table">';
        bodyText += '<tr>';
        for (var localeName in clientSettingCache[keyName][iteration]['description']) {
            var value = clientSettingCache[keyName][iteration]['description'][localeName];
            var localeID = inputID + localeName;
            bodyText += '<td style="border:0; text-align: right">' + localeName + '</td><td style="border:0;"><input type="text" value="' + value + '" id="' + localeID + '' + '"/></td>';
            if (localeName != '') {
                bodyText += '<td style="border:0">';
                bodyText += '<img id="' + localeID + '-removeButton' + '" alt="crossMark" height="15" width="15" src="' + PWM_GLOBAL['url-resources'] + '/redX.png"';
                bodyText += ' onclick="FormTableHandler.removeDescriptionLocale(\'' + keyName + '\',' + iteration + ',\'' + localeName + '\')" />';
                bodyText += '</td>';
            }
            bodyText += '</tr><tr>';
        }
        bodyText += '</tr></table>';
        bodyText += '<br/>';
        bodyText += '<button class="btn" onclick="PWM_MAIN.clearDijitWidget(\'dialogPopup\');FormTableHandler.showOptionsDialog(\'' + keyName + '\',\'' + iteration + '\')">OK</button>';

        PWM_MAIN.clearDijitWidget('dialogPopup');
        var theDialog = new dijit.Dialog({
            id: 'dialogPopup',
            title: 'Description for ' + clientSettingCache[keyName][iteration]['name'],
            style: "width: 450px",
            content: bodyText,
            hide: function(){
                PWM_MAIN.clearDijitWidget('dialogPopup');
                FormTableHandler.showOptionsDialog(keyName,iteration);
            }
        });
        theDialog.show();

        for (var localeName in clientSettingCache[keyName][iteration]['description']) {
            var value = clientSettingCache[keyName][iteration]['description'][localeName];
            var loopID = inputID + localeName;
            PWM_MAIN.clearDijitWidget(loopID);
            new dijit.form.Textarea({
                onChange: function(){clientSettingCache[keyName][iteration]['description'][localeName] = this.value;FormTableHandler.writeFormSetting(keyName)}
            },loopID);
        }

        var addLocaleFunction = function() {
            require(["dijit/registry"],function(registry){
                FormTableHandler.addDescriptionLocale(keyName, iteration, registry.byId(inputID + "-addLocaleValue").value);
            });
        };

        addAddLocaleButtonRow(inputID + 'table', inputID, addLocaleFunction);
    });
};

FormTableHandler.addDescriptionLocale = function(keyName, iteration, localeName) {
    clientSettingCache[keyName][iteration]['description'][localeName] = '';
    FormTableHandler.writeFormSetting(keyName);
    FormTableHandler.showDescriptionDialog(keyName, iteration);
};

FormTableHandler.removeDescriptionLocale = function(keyName, iteration, localeName) {
    delete clientSettingCache[keyName][iteration]['description'][localeName];
    FormTableHandler.writeFormSetting(keyName);
    FormTableHandler.showDescriptionDialog(keyName, iteration);
};

// -------------------------- change password handler ------------------------------------

var ChangePasswordHandler = {};

ChangePasswordHandler.init = function(settingKey,settingName,writeFunction) {
    if (!clientSettingCache[settingKey]) {
        clientSettingCache[settingKey] = {};
    }
    if (!clientSettingCache[settingKey]['settings']) {
        clientSettingCache[settingKey]['settings'] = {};
    }
    clientSettingCache[settingKey]['settings']['name'] = settingName;
    if (writeFunction) {
        clientSettingCache[settingKey]['settings']['writeFunction'] = writeFunction;
    } else {
        clientSettingCache[settingKey]['settings']['writeFunction'] = 'ChangePasswordHandler.doChange(\'' + settingKey + '\')';
    }
    clientSettingCache[settingKey]['settings']['showFields'] = false;
    ChangePasswordHandler.clear(settingKey);
    ChangePasswordHandler.changePasswordPopup(settingKey);
}

ChangePasswordHandler.validatePasswordPopupFields = function() {
    require(["dojo","dijit/registry"],function(dojo,registry){
        var password1 = registry.byId('password1').get('value');
        var password2 = registry.byId('password2').get('value');

        var matchStatus = "";

        PWM_MAIN.getObject('password_button').disabled = true;
        if (password2.length > 0) {
            if (password1 == password2) {
                matchStatus = "MATCH";
                PWM_MAIN.getObject('password_button').disabled = false;
            } else {
                matchStatus = "NO_MATCH";
            }
        }

        ChangePasswordHandler.markConfirmationCheck(matchStatus);
    });
};

ChangePasswordHandler.markConfirmationCheck = function(matchStatus) {
    if (matchStatus == "MATCH") {
        PWM_MAIN.getObject("confirmCheckMark").style.visibility = 'visible';
        PWM_MAIN.getObject("confirmCrossMark").style.visibility = 'hidden';
        PWM_MAIN.getObject("confirmCheckMark").width = '15';
        PWM_MAIN.getObject("confirmCrossMark").width = '0';
    } else if (matchStatus == "NO_MATCH") {
        PWM_MAIN.getObject("confirmCheckMark").style.visibility = 'hidden';
        PWM_MAIN.getObject("confirmCrossMark").style.visibility = 'visible';
        PWM_MAIN.getObject("confirmCheckMark").width = '0';
        PWM_MAIN.getObject("confirmCrossMark").width = '15';
    } else {
        PWM_MAIN.getObject("confirmCheckMark").style.visibility = 'hidden';
        PWM_MAIN.getObject("confirmCrossMark").style.visibility = 'hidden';
        PWM_MAIN.getObject("confirmCheckMark").width = '0';
        PWM_MAIN.getObject("confirmCrossMark").width = '0';
    }
};

ChangePasswordHandler.doChange = function(settingKey) {
    var password1 = clientSettingCache[settingKey]['settings']['p1'];
    PWM_MAIN.clearDijitWidget('dialogPopup');
    writeSetting(settingKey,password1);
    PWM_MAIN.showInfo(clientSettingCache[settingKey]['settings']['name'] + ' password recorded ');
    clear(settingKey);
};

ChangePasswordHandler.clear = function(settingKey) {
    clientSettingCache[settingKey]['settings']['p1'] = '';
    clientSettingCache[settingKey]['settings']['p2'] = '';
}

ChangePasswordHandler.generateRandom = function(settingKey) {
    ChangePasswordHandler.clear(settingKey);
    if (!clientSettingCache[settingKey]['settings']['showFields']) {
        clientSettingCache[settingKey]['settings']['showFields'] = true;
        ChangePasswordHandler.changePasswordPopup(settingKey);
    }
    require(["dojo","dijit/registry"],function(dojo,registry){
        var charMap = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        if (registry.byId('special').checked) {
            charMap += '~`!@#$%^&*()_-+=;:,.[]{}';
        }
        var length = registry.byId('randomLength').value;
        var postData = { };
        postData.maxLength = length;
        postData.minLength = length;
        postData.chars = charMap;
        postData.noUser = true;
        PWM_MAIN.getObject('generateButton').disabled = true;
        PWM_MAIN.getObject('generateButton').innerHTML = PWM_STRINGS['Display_PleaseWait'];

        dojo.xhrPost({
            url:PWM_GLOBAL['url-restservice'] + "/randompassword",
            preventCache: true,
            headers: {"Accept":"application/json","X-RestClientKey":PWM_GLOBAL['restClientKey']},
            postData: postData,
            dataType: "json",
            handleAs: "json",
            load: function(data) {
                registry.byId('password1').set('value',data['data']['password']);
                registry.byId('password2').set('value','');
                PWM_MAIN.getObject('generateButton').disabled = false;
                PWM_MAIN.getObject('generateButton').innerHTML = "Random";
            },
            error: function(error) {
                PWM_MAIN.getObject('generateButton').disabled = false;
                PWM_MAIN.getObject('generateButton').innerHTML = "Random";
                alert('error reading random password: ' + error);
            }
        });
    });
};

ChangePasswordHandler.changePasswordPopup = function(settingKey) {
    var writeFunction = clientSettingCache[settingKey]['settings']['writeFunction'];
    require(["dojo/parser","dijit/registry","dijit/Dialog","dijit/form/Textarea","dijit/form/TextBox","dijit/form/NumberSpinner","dijit/form/CheckBox"],
        function(dojoParser,registry,Dialog,Textarea,TextBox)
        {
            var bodyText = '<div id="changePasswordDialogDiv">';
            bodyText += '<span id="message" class="message message-info">' + clientSettingCache[settingKey]['settings']['name'] + '</span><br/>';
            bodyText += '<table style="border: 0">';
            bodyText += '<tr style="border: 0"><td style="border: 0">';
            bodyText += '<input name="password1" id="password1" class="inputfield" style="width: 500px; max-height: 200px; overflow: auto" autocomplete="off">' + '</input>';
            bodyText += '</td></tr><tr style="border: 0">';
            bodyText += '<td style="border: 0" xmlns="http://www.w3.org/1999/html"><input name="password2" id="password2" class="inputfield" style="width: 500px; max-height: 200px; overflow: auto;" autocomplete="off"/></input></td>';

            bodyText += '<td style="border: 0"><div style="margin:0;">';
            bodyText += '<img style="visibility:hidden;" id="confirmCheckMark" alt="checkMark" height="15" width="15" src="' + PWM_GLOBAL['url-resources'] + '/greenCheck.png">';
            bodyText += '<img style="visibility:hidden;" id="confirmCrossMark" alt="crossMark" height="15" width="15" src="' + PWM_GLOBAL['url-resources'] + '/redX.png">';
            bodyText += '</div></td>';

            bodyText += '</tr></table>';
            bodyText += '<button name="change" class="btn" id="password_button" onclick="' + writeFunction + '" disabled="true"/>';
            bodyText += 'Store Password</button>&nbsp;&nbsp;';
            bodyText += '<button id="generateButton" name="generateButton" class="btn" onclick="ChangePasswordHandler.generateRandom(\'' + settingKey + '\')">Random</button>';
            bodyText += '&nbsp;&nbsp;<input style="width:60px" data-dojo-props="constraints: { min:1, max:102400 }" data-dojo-type="dijit/form/NumberSpinner" id="randomLength" value="32"/>Length';
            bodyText += '&nbsp;&nbsp;<input type="checkbox" id="special" data-dojo-type="dijit/form/CheckBox" value="10"/>Special';
            bodyText += '&nbsp;&nbsp;<input type="checkbox" id="show" data-dojo-type="dijit/form/CheckBox" data-dojo-props="checked:' + clientSettingCache[settingKey]['settings']['showFields'] + '" value="10"/>Show';
            bodyText += '</div>';

            PWM_MAIN.clearDijitWidget('dialogPopup');
            var theDialog = new dijit.Dialog({
                id: 'dialogPopup',
                title: 'Store Password',
                style: "width: 550px",
                content: bodyText,
                hide: function(){
                    PWM_MAIN.clearDijitWidget('dialogPopup');
                    ChangePasswordHandler.clear(settingKey);
                }
            });
            theDialog.show();
            registry.byId('show').set('onChange',function(){
                clientSettingCache[settingKey]['settings']['showFields'] = this.checked;
                ChangePasswordHandler.changePasswordPopup(settingKey);
            });

            dojoParser.parse(PWM_MAIN.getObject('changePasswordDialogDiv'));

            var p1 = clientSettingCache[settingKey]['settings']['p1'];
            var p2 = clientSettingCache[settingKey]['settings']['p2'];
            if (clientSettingCache[settingKey]['settings']['showFields']) {
                new Textarea({
                    id: 'password1',
                    onKeyUp: function(){
                        clientSettingCache[settingKey]['settings']['p1'] = this.get('value');
                        ChangePasswordHandler.validatePasswordPopupFields();
                        registry.byId('password2').set('value','')
                    },
                    value: p1
                },'password1');
                new Textarea({
                    id: 'password2',
                    onKeyUp: function(){
                        clientSettingCache[settingKey]['settings']['p2'] = this.get('value');
                        ChangePasswordHandler.validatePasswordPopupFields();
                    },
                    value: p2
                },'password2');
            } else {
                new TextBox({
                    id: 'password1',
                    type: 'password',
                    style: 'width: 100%',
                    onKeyUp: function(){
                        clientSettingCache[settingKey]['settings']['p1'] = this.get('value');
                        ChangePasswordHandler.validatePasswordPopupFields();
                        registry.byId('password2').set('value','')
                    },
                    value: p1
                },'password1');
                new TextBox({
                    id: 'password2',
                    type: 'password',
                    style: 'width: 100%',
                    onKeyUp: function(){
                        clientSettingCache[settingKey]['settings']['p2'] = this.get('value');
                        ChangePasswordHandler.validatePasswordPopupFields();
                    },
                    value: p2
                },'password2');
            }
            PWM_MAIN.getObject('password1').focus();
            ChangePasswordHandler.validatePasswordPopupFields();
        });
};



// -------------------------- action handler ------------------------------------

var ActionHandler = {};

ActionHandler.init = function(keyName) {
    console.log('ActionHandler init for ' + keyName);
    var parentDiv = 'table_setting_' + keyName;
    clearDivElements(parentDiv, true);
    readSetting(keyName, function(resultValue) {
        clientSettingCache[keyName] = resultValue;
        ActionHandler.redraw(keyName);
    });
};

ActionHandler.redraw = function(keyName) {
    console.log('ActionHandler redraw for ' + keyName)
    var resultValue = clientSettingCache[keyName];
    var parentDiv = 'table_setting_' + keyName;
    clearDivElements(parentDiv, false);
    var parentDivElement = PWM_MAIN.getObject(parentDiv);

    if (!PWM_MAIN.isEmpty(resultValue)) {
        var headerRow = document.createElement("tr");
        headerRow.setAttribute("style", "border-width: 0");

        var header1 = document.createElement("td");
        header1.setAttribute("style", "border-width: 0;");
        header1.innerHTML = "Name";
        headerRow.appendChild(header1);

        var header2 = document.createElement("td");
        header2.setAttribute("style", "border-width: 0;");
        header2.innerHTML = "Description";
        headerRow.appendChild(header2);

        parentDivElement.appendChild(headerRow);
    }

    for (var i in resultValue) {
        ActionHandler.drawRow(parentDiv, keyName, i, resultValue[i]);
    }

    {
        var newTableRow = document.createElement("tr");
        newTableRow.setAttribute("style", "border-width: 0");
        newTableRow.setAttribute("colspan", "5");

        var newTableData = document.createElement("td");
        newTableData.setAttribute("style", "border-width: 0; width: 50px");

        var addItemButton = document.createElement("button");
        addItemButton.setAttribute("type", "button");
        addItemButton.setAttribute("onclick", "ActionHandler.addMultiSetting('" + keyName + "','" + parentDiv + "');");
        addItemButton.setAttribute("data-dojo-type", "dijit.form.Button");
        addItemButton.innerHTML = "Add Value";
        newTableData.appendChild(addItemButton);

        newTableRow.appendChild(newTableData);
        parentDivElement.appendChild(newTableRow);
    }
    require(["dojo/parser","dijit/form/Button","dijit/form/Select","dijit/form/Textarea"],function(dojoParser){
        dojoParser.parse(parentDiv);
    });
};

ActionHandler.drawRow = function(parentDiv, settingKey, iteration, value) {
    var inputID = 'value_' + settingKey + '_' + iteration + "_";

    // clear the old dijit node (if it exists)
    PWM_MAIN.clearDijitWidget(inputID + "name");
    PWM_MAIN.clearDijitWidget(inputID + "description");
    PWM_MAIN.clearDijitWidget(inputID + "type");
    PWM_MAIN.clearDijitWidget(inputID + "optionsButton");

    var newTableRow = document.createElement("tr");
    newTableRow.setAttribute("style", "border-width: 0");
    {
        {
            var td1 = document.createElement("td");
            td1.setAttribute("style", "border-width: 0; width:50px");
            var nameInput = document.createElement("input");
            nameInput.setAttribute("id", inputID + "name");
            nameInput.setAttribute("value", value['name']);
            nameInput.setAttribute("onchange","clientSettingCache['" + settingKey + "'][" + iteration + "]['name'] = this.value;ActionHandler.writeFormSetting('" + settingKey + "')");
            nameInput.setAttribute("data-dojo-type", "dijit.form.ValidationTextBox");
            nameInput.setAttribute("data-dojo-props", "required: true");

            td1.appendChild(nameInput);
            newTableRow.appendChild(td1);
        }

        {
            var td2 = document.createElement("td");
            td2.setAttribute("style", "border-width: 0");
            var descriptionInput = document.createElement("input");
            descriptionInput.setAttribute("id", inputID + "description");
            descriptionInput.setAttribute("value", value['description']);
            descriptionInput.setAttribute("onchange","clientSettingCache['" + settingKey + "'][" + iteration + "]['description'] = this.value;ActionHandler.writeFormSetting('" + settingKey + "')");
            descriptionInput.setAttribute("data-dojo-type", "dijit.form.ValidationTextBox");
            td2.appendChild(descriptionInput);
            newTableRow.appendChild(td2);
        }

        {
            var td3 = document.createElement("td");
            td3.setAttribute("style", "border-width: 0");
            var optionList = PWM_GLOBAL['actionTypeOptions'];
            var typeSelect = document.createElement("select");
            typeSelect.setAttribute("data-dojo-type", "dijit.form.Select");
            typeSelect.setAttribute("id", inputID + "type");
            typeSelect.setAttribute("style","width: 90px");
            typeSelect.setAttribute("onchange","clientSettingCache['" + settingKey + "'][" + iteration + "]['type'] = this.value;ActionHandler.writeFormSetting('" + settingKey + "')");
            for (var optionItem in optionList) {
                var optionElement = document.createElement("option");
                optionElement.value = optionList[optionItem];
                optionElement.innerHTML = optionList[optionItem];
                if (optionList[optionItem] == clientSettingCache[settingKey][iteration]['type']) {
                    optionElement.setAttribute("selected","true");
                }
                typeSelect.appendChild(optionElement);
            }

            td3.appendChild(typeSelect);
            newTableRow.appendChild(td3);
        }

        {
            var td4 = document.createElement("td");
            td4.setAttribute("style", "border-width: 0");
            var labelButton = document.createElement("button");
            labelButton.setAttribute("id", inputID + "optionsButton");
            labelButton.setAttribute("data-dojo-type", "dijit.form.Button");
            labelButton.setAttribute("onclick","ActionHandler.showOptionsDialog('" + settingKey + "'," + iteration + ")");
            labelButton.innerHTML = "Options";
            td4.appendChild(labelButton);
            newTableRow.appendChild(td4);
        }

        var tdFinal = document.createElement("td");
        tdFinal.setAttribute("style", "border-width: 0");

        var imgElement = document.createElement("img");
        imgElement.setAttribute("style", "width: 10px; height: 10px");
        imgElement.setAttribute("src", PWM_GLOBAL['url-resources'] + "/redX.png");
        imgElement.setAttribute("onclick", "ActionHandler.removeMultiSetting('" + settingKey + "','" + iteration + "')");
        tdFinal.appendChild(imgElement);
        newTableRow.appendChild(tdFinal);
    }
    var parentDivElement = PWM_MAIN.getObject(parentDiv);
    parentDivElement.appendChild(newTableRow);
};

ActionHandler.writeFormSetting = function(settingKey) {
    var cachedSetting = clientSettingCache[settingKey];
    writeSetting(settingKey, cachedSetting);
};

ActionHandler.removeMultiSetting = function(keyName, iteration) {
    delete clientSettingCache[keyName][iteration];
    console.log("removed iteration " + iteration + " from " + keyName + ", cached keyValue=" + clientSettingCache[keyName]);
    ActionHandler.writeFormSetting(keyName);
    ActionHandler.redraw(keyName);
};

ActionHandler.addMultiSetting = function(keyName) {
    var currentSize = 0;
    for (var loopVar in clientSettingCache[keyName]) {
        currentSize++;
    }
    clientSettingCache[keyName][currentSize + 1] = {};
    clientSettingCache[keyName][currentSize + 1]['name'] = '';
    clientSettingCache[keyName][currentSize + 1]['description'] = '';
    clientSettingCache[keyName][currentSize + 1]['type'] = 'webservice';
    clientSettingCache[keyName][currentSize + 1]['method'] = 'get';
    ActionHandler.writeFormSetting(keyName);
    ActionHandler.redraw(keyName)
};

ActionHandler.showOptionsDialog = function(keyName, iteration) {
    require(["dojo/store/Memory","dijit/Dialog","dijit/form/Textarea","dijit/form/CheckBox","dijit/form/Select","dijit/form/ValidationTextBox"],function(Memory){
        var inputID = 'value_' + keyName + '_' + iteration + "_";
        var bodyText = '<table style="border:0">';
        if (clientSettingCache[keyName][iteration]['type'] == 'webservice') {
            bodyText += '<tr>';
            bodyText += '<td style="border:0; text-align: center" colspan="2">Web Service</td>';
            bodyText += '</tr><tr>';
            bodyText += '<td style="border:0; text-align: right">&nbsp;</td>';
            bodyText += '</tr><tr>';
            bodyText += '<td style="border:0; text-align: right">Method</td><td style="border:0;"><select id="' + inputID + 'method' + '"/></td>';
            bodyText += '</tr><tr>';
            //bodyText += '<td style="border:0; text-align: right">Client Side</td><td style="border:0;"><input type="checkbox" id="' + inputID + 'clientSide' + '"/></td>';
            //bodyText += '</tr><tr>';
            bodyText += '<td style="border:0; text-align: right">Headers</td><td style="border:0;"><button class="menubutton" onclick="ActionHandler.showHeadersDialog(\'' + keyName + '\',\'' + iteration + '\')">Edit</button></td>';
            bodyText += '</tr><tr>';
            bodyText += '<td style="border:0; text-align: right">URL</td><td style="border:0;"><input type="text" id="' + inputID + 'url' + '"/></td>';
            bodyText += '</tr><tr>';
            bodyText += '<td style="border:0; text-align: right">Body</td><td style="border:0;"><input type="text" id="' + inputID + 'body' + '"/></td>';
            bodyText += '</tr>';
        } else if (clientSettingCache[keyName][iteration]['type'] == 'ldap') {
            bodyText += '<tr>';
            bodyText += '<td style="border:0; text-align: center" colspan="2">LDAP Value Write</td>';
            bodyText += '</tr><tr>';
            bodyText += '<td style="border:0; text-align: right">&nbsp;</td>';
            bodyText += '</tr><tr>';
            bodyText += '<td style="border:0; text-align: right">Attribute Name</td><td style="border:0;"><input type="text" id="' + inputID + 'attributeName' + '"/></td>';
            bodyText += '</tr><tr>';
            bodyText += '<td style="border:0; text-align: right">Attribute Value</td><td style="border:0;"><input type="text" id="' + inputID + 'attributeValue' + '"/></td>';
            bodyText += '</tr>';
        }
        bodyText += '<tr>';
        bodyText += '<td style="border:0; text-align: right">&nbsp;</td>';
        bodyText += '</tr><tr>';
        bodyText += '</tr>';
        bodyText += '</table>';
        bodyText += '<br/>';
        bodyText += '<button class="btn" onclick="PWM_MAIN.clearDijitWidget(\'dialogPopup\');ActionHandler.redraw(\'' + keyName + '\')">OK</button>';

        PWM_MAIN.clearDijitWidget('dialogPopup');
        var theDialog = new dijit.Dialog({
            id: 'dialogPopup',
            title: 'Options for ' + clientSettingCache[keyName][iteration]['name'],
            style: "width: 650px",
            content: bodyText,
            hide: function(){
                PWM_MAIN.clearDijitWidget('dialogPopup');
                ActionHandler.redraw(keyName);
            }
        });
        theDialog.show();

        if (clientSettingCache[keyName][iteration]['type'] == 'webservice') {
            PWM_MAIN.clearDijitWidget(inputID + "method");
            new dijit.form.Select({
                value: clientSettingCache[keyName][iteration]['method'],
                options: [
                    { label: "Delete", value: "delete" },
                    { label: "Get", value: "get" },
                    { label: "Post", value: "post" },
                    { label: "Put", value: "put" }
                ],
                style: "width: 80px",
                onChange: function(){clientSettingCache[keyName][iteration]['method'] = this.value;ActionHandler.writeFormSetting(keyName)}
            },inputID + "method");

            //PWM_MAIN.clearDijitWidget(inputID + "clientSide");
            //new dijit.form.CheckBox({
            //    checked: clientSettingCache[keyName][iteration]['clientSide'],
            //    onChange: function(){clientSettingCache[keyName][iteration]['clientSide'] = this.checked;ActionHandler.writeFormSetting(keyName)}
            //},inputID + "clientSide");

            PWM_MAIN.clearDijitWidget(inputID + "url");
            new dijit.form.Textarea({
                value: clientSettingCache[keyName][iteration]['url'],
                required: true,
                onChange: function(){clientSettingCache[keyName][iteration]['url'] = this.value;ActionHandler.writeFormSetting(keyName)}
            },inputID + "url");

            PWM_MAIN.clearDijitWidget(inputID + "body");
            new dijit.form.Textarea({
                value: clientSettingCache[keyName][iteration]['body'],
                onChange: function(){clientSettingCache[keyName][iteration]['body'] = this.value;ActionHandler.writeFormSetting(keyName)}
            },inputID + "body");

        } else if (clientSettingCache[keyName][iteration]['type'] == 'ldap') {
            PWM_MAIN.clearDijitWidget(inputID + "attributeName");
            new dijit.form.ValidationTextBox({
                value: clientSettingCache[keyName][iteration]['attributeName'],
                required: true,
                onChange: function(){clientSettingCache[keyName][iteration]['attributeName'] = this.value;ActionHandler.writeFormSetting(keyName)}
            },inputID + "attributeName");

            PWM_MAIN.clearDijitWidget(inputID + "attributeValue");
            new dijit.form.Textarea({
                value: clientSettingCache[keyName][iteration]['attributeValue'],
                required: true,
                onChange: function(){clientSettingCache[keyName][iteration]['attributeValue'] = this.value;ActionHandler.writeFormSetting(keyName)}
            },inputID + "attributeValue");
        }
    });
};

ActionHandler.showHeadersDialog = function(keyName, iteration) {
    require(["dijit/Dialog","dijit/form/ValidationTextBox","dijit/form/Button","dijit/form/TextBox"],function(Dialog,ValidationTextBox,Button,TextBox){
        var inputID = 'value_' + keyName + '_' + iteration + "_" + "headers_";

        var bodyText = '';
        bodyText += '<table style="border:0" id="' + inputID + 'table">';
        bodyText += '<tr>';
        bodyText += '<td style="border:0"><b>Name</b></td><td style="border:0"><b>Value</b></td>';
        bodyText += '</tr><tr>';
        for (var headerName in clientSettingCache[keyName][iteration]['headers']) {
            var value = clientSettingCache[keyName][iteration]['headers'][headerName];
            var optionID = inputID + headerName;
            bodyText += '<td style="border:1px">' + headerName + '</td><td style="border:1px">' + value + '</td>';
            bodyText += '<td style="border:0">';
            bodyText += '<img id="' + optionID + '-removeButton' + '" alt="crossMark" height="15" width="15" src="' + PWM_GLOBAL['url-resources'] + '/redX.png"';
            bodyText += ' onclick="ActionHandler.removeHeader(\'' + keyName + '\',' + iteration + ',\'' + headerName + '\')" />';
            bodyText += '</td>';
            bodyText += '</tr><tr>';
        }
        bodyText += '</tr></table>';
        bodyText += '<br/>';
        bodyText += '<br/>';
        bodyText += '<input type="text" id="addHeaderName"/>';
        bodyText += '<input type="text" id="addHeaderValue"/>';
        bodyText += '<input type="button" id="addHeaderButton" value="Add"/>';
        bodyText += '<br/>';
        bodyText += '<button class="btn" onclick="ActionHandler.showOptionsDialog(\'' + keyName + '\',\'' + iteration + '\')">OK</button>';

        PWM_MAIN.clearDijitWidget('dialogPopup');
        var theDialog = new dijit.Dialog({
            id: 'dialogPopup',
            title: 'Http Headers for webservice ' + clientSettingCache[keyName][iteration]['name'],
            style: "width: 450px",
            content: bodyText,
            hide: function(){
                PWM_MAIN.clearDijitWidget('dialogPopup');
                ActionHandler.showOptionsDialog(keyName,iteration);
            }
        });
        theDialog.show();

        for (var headerName in clientSettingCache[keyName][iteration]['headers']) {
            var value = clientSettingCache[keyName][iteration]['headers'][headerName];
            var loopID = inputID + headerName;
            PWM_MAIN.clearDijitWidget(loopID);
            new TextBox({
                onChange: function(){clientSettingCache[keyName][iteration]['headers'][headerName] = this.value;ActionHandler.writeFormSetting(keyName)}
            },loopID);
        }

        PWM_MAIN.clearDijitWidget("addHeaderName");
        new ValidationTextBox({
            placeholder: "Name",
            id: "addHeaderName",
            constraints: {min: 1}
        },"addHeaderName");

        PWM_MAIN.clearDijitWidget("addHeaderValue");
        new ValidationTextBox({
            placeholder: "Display Value",
            id: "addHeaderValue",
            constraints: {min: 1}
        },"addHeaderValue");

        PWM_MAIN.clearDijitWidget("addHeaderButton");
        new Button({
            label: "Add",
            onClick: function() {
                require(["dijit/registry"],function(registry){
                    var name = registry.byId('addHeaderName').value;
                    var value = registry.byId('addHeaderValue').value;
                    ActionHandler.addHeader(keyName, iteration, name, value);
                });
            }
        },"addHeaderButton");
    });
};

ActionHandler.addHeader = function(keyName, iteration, headerName, headerValue) {
    if (headerName == null || headerName.length < 1) {
        alert('Name field is required');
        return;
    }

    if (headerValue == null || headerValue.length < 1) {
        alert('Value field is required');
        return;
    }

    if (!clientSettingCache[keyName][iteration]['headers']) {
        clientSettingCache[keyName][iteration]['headers'] = {};
    }

    clientSettingCache[keyName][iteration]['headers'][headerName] = headerValue;
    ActionHandler.writeFormSetting(keyName);
    ActionHandler.showHeadersDialog(keyName, iteration);
};

ActionHandler.removeHeader = function(keyName, iteration, headerName) {
    delete clientSettingCache[keyName][iteration]['headers'][headerName];
    ActionHandler.writeFormSetting(keyName);
    ActionHandler.showHeadersDialog(keyName, iteration);
};

// -------------------------- email table handler ------------------------------------

var EmailTableHandler = {};

EmailTableHandler.init = function(keyName) {
    console.log('EmailTableHandler init for ' + keyName);
    readSetting(keyName, function(resultValue) {
        clientSettingCache[keyName] = resultValue;
        EmailTableHandler.draw(keyName);
    });
};

EmailTableHandler.draw = function(keyName) {
    var resultValue = clientSettingCache[keyName];
    var parentDiv = 'table_setting_' + keyName;
    clearDivElements(parentDiv, true);
    require(["dojo/parser","dojo/html","dijit/form/ValidationTextBox","dijit/form/Textarea"],
        function(dojoParser,dojoHtml,ValidationTextBox,Textarea){
            clearDivElements(parentDiv, false);
            for (var localeName in resultValue) {
                EmailTableHandler.drawRow(keyName,localeName,parentDiv)
            }

            if (PWM_MAIN.isEmpty(resultValue)) {
                var newTableRow = document.createElement("tr");
                newTableRow.setAttribute("style", "border-width: 0");
                newTableRow.setAttribute("colspan", "5");

                var newTableData = document.createElement("td");
                newTableData.setAttribute("style", "border-width: 0;");

                var addItemButton = document.createElement("button");
                addItemButton.setAttribute("type", "[button");
                addItemButton.setAttribute("onclick", "resetSetting('" + keyName + "');loadMainPageBody()");
                addItemButton.setAttribute("data-dojo-type", "dijit.form.Button");
                addItemButton.innerHTML = "Add Value";
                newTableData.appendChild(addItemButton);

                newTableRow.appendChild(newTableData);
                var parentDivElement = PWM_MAIN.getObject(parentDiv);
                parentDivElement.appendChild(newTableRow);
            } else {
                var addLocaleFunction = function() {
                    require(["dijit/registry"],function(registry){
                        var localeValue = registry.byId(keyName + "-addLocaleValue").value;
                        if (!clientSettingCache[keyName][localeValue]) {
                            clientSettingCache[keyName][localeValue] = {};
                            EmailTableHandler.writeSetting(keyName,true);
                        }
                    });
                };
                addAddLocaleButtonRow(parentDiv, keyName, addLocaleFunction);
            }
            dojoParser.parse(parentDiv);
        });
};

EmailTableHandler.drawRow = function(keyName, localeName, parentDiv) {
    require(["dojo/parser","dojo/html","dijit/form/ValidationTextBox","dijit/form/Textarea"],
        function(dojoParser,dojoHtml,ValidationTextBox,Textarea){
            var localeTableRow = document.createElement("tr");
            localeTableRow.setAttribute("style", "border-width: 0;");

            var localeTdName = document.createElement("td");
            localeTdName.setAttribute("style", "border-width: 0; width:15px");
            localeTdName.innerHTML = localeName;
            localeTableRow.appendChild(localeTdName);

            var localeTdContent = document.createElement("td");
            localeTdContent.setAttribute("style", "border-width: 0; width: 520px");
            localeTableRow.appendChild(localeTdContent);

            var localeTableElement = document.createElement("table");
            localeTableElement.setAttribute("style", "border-width: 1px; width:515px; margin:0");
            localeTdContent.appendChild(localeTableElement);

            var idPrefix = "setting_" + localeName + "_" + keyName;
            var htmlBody = '';
            htmlBody += '<table>';
            htmlBody += '<tr style="border:0"><td style="border:0; width:30px; text-align:right">To</td>';
            htmlBody += '<td style="border:0"><input id="' + idPrefix + '_to"/></td></tr>';
            htmlBody += '<tr style="border:0"><td style="border:0; width:30px; text-align:right">From</td>';
            htmlBody += '<td style="border:0"><input id="' + idPrefix + '_from"/></td></tr>';
            htmlBody += '<tr style="border:0"><td style="border:0; width:30px; text-align:right">Subject</td>';
            htmlBody += '<td style="border:0"><input id="' + idPrefix + '_subject"/></td></tr>';
            htmlBody += '<tr style="border:0"><td style="border:0; width:30px; text-align:right">Plain Body</td>';
            htmlBody += '<td style="border:0"><input id="' + idPrefix + '_bodyPlain"/></td></tr>';
            htmlBody += '<tr style="border:0"><td style="border:0; width:30px; text-align:right">HTML Body</td>';
            htmlBody += '<td style="border:0"><div style="border:2px solid #EAEAEA; background: white; width: 446px" onclick="EmailTableHandler.popupEditor(\'' + keyName + '\',\'' + localeName + '\')">';
            htmlBody += clientSettingCache[keyName][localeName]['bodyHtml'] ? clientSettingCache[keyName][localeName]['bodyHtml'] : "&nbsp;" ;
            htmlBody += '</div></td></tr>';
            htmlBody += "</table>"
            dojoHtml.set(localeTableElement,htmlBody);
            var parentDivElement = PWM_MAIN.getObject(parentDiv);
            parentDivElement.appendChild(localeTableRow);

            PWM_MAIN.clearDijitWidget(idPrefix + "_to");
            new ValidationTextBox({
                value: clientSettingCache[keyName][localeName]['to'],
                style: 'width: 450px',
                required: true,
                onChange: function(){clientSettingCache[keyName][localeName]['to'] = this.value;EmailTableHandler.writeSetting(keyName)}
            },idPrefix + "_to");

            PWM_MAIN.clearDijitWidget(idPrefix + "_from");
            new ValidationTextBox({
                value: clientSettingCache[keyName][localeName]['from'],
                style: 'width: 450px',
                required: true,
                onChange: function(){clientSettingCache[keyName][localeName]['from'] = this.value;EmailTableHandler.writeSetting(keyName)}
            },idPrefix + "_from");

            PWM_MAIN.clearDijitWidget(idPrefix + "_subject");
            new ValidationTextBox({
                value: clientSettingCache[keyName][localeName]['subject'],
                style: 'width: 450px',
                required: true,
                onChange: function(){clientSettingCache[keyName][localeName]['subject'] = this.value;EmailTableHandler.writeSetting(keyName)}
            },idPrefix + "_subject");

            PWM_MAIN.clearDijitWidget(idPrefix + "_bodyPlain");
            new Textarea({
                value: clientSettingCache[keyName][localeName]['bodyPlain'],
                style: 'width: 450px',
                required: true,
                onChange: function(){clientSettingCache[keyName][localeName]['bodyPlain'] = this.value;EmailTableHandler.writeSetting(keyName)}
            },idPrefix + "_bodyPlain");

            { // add a spacer row
                var spacerTableRow = document.createElement("tr");
                spacerTableRow.setAttribute("style", "border-width: 0");
                parentDivElement.appendChild(spacerTableRow);

                var spacerTableData = document.createElement("td");
                spacerTableData.setAttribute("style", "border-width: 0");
                spacerTableData.innerHTML = "&nbsp;";
                spacerTableRow.appendChild(spacerTableData);
            }

            if (localeName != '' || PWM_MAIN.itemCount(clientSettingCache[keyName])){ // add remove locale x
                var imgElement2 = document.createElement("img");
                imgElement2.setAttribute("style", "width: 12px; height: 12px;");
                imgElement2.setAttribute("src", PWM_GLOBAL['url-resources'] + "/redX.png");
                imgElement2.setAttribute("onclick", "delete clientSettingCache['" + keyName + "']['" + localeName + "'];EmailTableHandler.writeSetting('" + keyName + "',true)");
                var tdElement = document.createElement("td");
                tdElement.setAttribute("style", "border-width: 0; text-align: left; vertical-align: top");

                localeTableRow.appendChild(tdElement);
                tdElement.appendChild(imgElement2);
            }
        });
}


EmailTableHandler.popupEditor = function(keyName, localeName) {
    require(["dijit/Dialog","dijit/Editor","dijit/_editor/plugins/AlwaysShowToolbar","dijit/_editor/plugins/LinkDialog","dijit/_editor/plugins/ViewSource","dijit/_editor/plugins/FontChoice","dijit/_editor/plugins/TextColor"],
        function(Dialog,Editor,AlwaysShowToolbar){
            var idValue = keyName + "_" + localeName + "_htmlEditor";
            var idValueDialog = idValue + "_Dialog";
            var bodyText = '';
            bodyText += '<div id="' + idValue + '" style="border:2px solid #EAEAEA; min-height: 200px;"></div>'
            bodyText += '<br/>'
            bodyText += '<button class="btn" onclick="EmailTableHandler.writeSetting(\'' + keyName + '\',true);PWM_MAIN.clearDijitWidget(\'' + idValueDialog + '\')"> OK </button>'
            PWM_MAIN.clearDijitWidget(idValue);
            PWM_MAIN.clearDijitWidget(idValueDialog);

            var dialog = new Dialog({
                id: idValueDialog,
                title: "HTML Editor",
                style: "width: 650px",
                content: bodyText
            });
            dialog.show();

            new Editor({
                extraPlugins: [
                    AlwaysShowToolbar,"viewsource",
                    {name:"dijit/_editor/plugins/LinkDialog",command:"createLink",urlRegExp:".*"},
                    "fontName","foreColor"
                ],
                height: '',
                value: clientSettingCache[keyName][localeName]['bodyHtml'],
                style: 'width: 630px',
                onChange: function(){clientSettingCache[keyName][localeName]['bodyHtml'] = this.get('value')},
                onKeyUp: function(){clientSettingCache[keyName][localeName]['bodyHtml'] = this.get('value')}
            },idValue).startup();
        });
};


EmailTableHandler.writeSetting = function(settingKey, redraw) {
    var currentValues = clientSettingCache[settingKey];
    writeSetting(settingKey, currentValues);
    if (redraw) {
        EmailTableHandler.draw(settingKey);
    }
};

// -------------------------- boolean handler ------------------------------------

var BooleanHandler = {};

BooleanHandler.init = function(keyName) {
    console.log('BooleanHandler init for ' + keyName);
    var parentDiv = 'button_' + keyName;
    clearDivElements(parentDiv, true);
    require(["dijit/form/ToggleButton"],function(ToggleButton){
        var toggleButton = new ToggleButton({
            id: parentDiv,
            iconClass:'dijitCheckBoxIcon',
            disabled: true,
            showLabel: PWM_STRINGS['Display_PleaseWait']
        },parentDiv);
        readSetting(keyName, function(resultValue) {
            require(["dijit/registry","dojo/on"],function(registry,on){
                var toggleButtonWidget = registry.byId(parentDiv);
                toggleButtonWidget.set('checked',resultValue);
                toggleButtonWidget.set('disabled',false);
                toggleButtonWidget.set('label','Enabled (True)');
                setTimeout(function(){
                    on(toggleButton,"change",function(){
                        BooleanHandler.toggle(keyName,toggleButton);
                    });
                },100);
            });
        });
    });
}

BooleanHandler.toggle = function(keyName,widget) {
    writeSetting(keyName,widget.checked);
}

// -------------------------- challenge handler ------------------------------------

var ChallengeTableHandler = {};
ChallengeTableHandler.defaultItem = {text:'Question',minLength:4,maxLength:200,adminDefined:true};

ChallengeTableHandler.init = function(parentDiv, keyName) {
    console.log('ChallengeTableHandler init for ' + keyName);
    clearDivElements(parentDiv, true);
    readSetting(keyName, function(resultValue) {
        clientSettingCache[keyName] = resultValue;
        ChallengeTableHandler.draw(parentDiv, keyName);
    });
};

ChallengeTableHandler.draw = function(parentDiv, keyName) {
    var resultValue = clientSettingCache[keyName];
    require(["dojo","dijit/registry","dojo/parser","dojo/json","dijit/form/Button","dijit/form/ValidationTextBox","dijit/form/Textarea","dijit/form/NumberSpinner","dijit/form/ToggleButton"],
        function(dojo,registry,dojoParser,json){
            clearDivElements(parentDiv, false);
            for (var localeName in resultValue) {
                (function(localeKey) {
                    var localeTableRow = document.createElement("tr");
                    localeTableRow.setAttribute("style", "border-width: 0;");

                    var localeTdName = document.createElement("td");
                    localeTdName.setAttribute("style", "border-width: 0; width:15px");
                    localeTdName.innerHTML = localeName;
                    localeTableRow.appendChild(localeTdName);

                    var localeTdContent = document.createElement("td");
                    localeTdContent.setAttribute("style", "border-width: 0; width: 525px");
                    localeTableRow.appendChild(localeTdContent);

                    var localeTableElement = document.createElement("table");
                    localeTableElement.setAttribute("style", "border-width: 2px; width:525px; margin:0");
                    localeTdContent.appendChild(localeTableElement);

                    var multiValues = resultValue[localeName];

                    for (var iteration in multiValues) {
                        (function(rowKey) {

                            var valueTableRow = document.createElement("tr");

                            var valueTd1 = document.createElement("td");
                            valueTd1.setAttribute("colspan", "200");
                            valueTd1.setAttribute("style", "border-width: 0;");

                            // clear the old dijit node (if it exists)
                            var inputID = "value-" + keyName + "-" + localeName + "-" + rowKey;
                            var oldDijitNode = registry.byId(inputID);
                            if (oldDijitNode != null) {
                                try {
                                    oldDijitNode.destroy();
                                } catch (error) {
                                }
                            }

                            var inputElement = document.createElement("textarea");
                            inputElement.setAttribute("id", inputID);
                            inputElement.setAttribute("value", multiValues[rowKey]['text']);
                            inputElement.setAttribute("onchange", "clientSettingCache['" + keyName + "']['" + localeKey + "']['" + rowKey + "']['text'] = this.value;ChallengeTableHandler.write('" + keyName + "')");
                            inputElement.setAttribute("style", "width: 490px");
                            inputElement.setAttribute("required","true");
                            inputElement.setAttribute("data-dojo-type", "dijit.form.Textarea");
                            inputElement.setAttribute("disabled", !multiValues[rowKey]['adminDefined']);
                            valueTd1.appendChild(inputElement);
                            valueTableRow.appendChild(valueTd1);

                            // add remove button
                            var imgElement = document.createElement("div");
                            imgElement.setAttribute("style", "width: 10px; height: 10px;");
                            imgElement.setAttribute("class", "fa fa-times icon_button");
                            imgElement.setAttribute("onclick", "delete clientSettingCache['" + keyName + "']['" + localeKey + "']['" + rowKey + "'];ChallengeTableHandler.write('" + keyName + "',true)");
                            valueTd1.appendChild(imgElement);

                            localeTableElement.appendChild(valueTableRow);

                            // options row
                            var optionRow = document.createElement("tr");
                            optionRow.setAttribute("style","padding-bottom: 5px; border-bottom: 1px solid #d3d3d3");
                            var optionRowHtml = '<td style="border-width:0px">&nbsp;&nbsp;&nbsp;';
                            var currentLabel = (multiValues[rowKey]['adminDefined']) ? 'Admin Defined' : 'User Defined';
                            optionRowHtml += 'Text: <button data-dojo-type="dijit/form/ToggleButton" data-dojo-props="checked:true,showLabel:true,label:\'' + currentLabel + '\',checked:' + multiValues[rowKey]['adminDefined'] + '"';
                            optionRowHtml += ' onchange="clientSettingCache[\'' + keyName + '\'][\'' + localeKey + '\'][\'' + rowKey + '\'][\'adminDefined\']=this.checked;';
                            optionRowHtml += 'ChallengeTableHandler.write(\'' + keyName + '\');';
                            optionRowHtml += 'ChallengeTableHandler.handleAdminToggled(this,\'' + inputID + '\')"></button>';
                            optionRowHtml += '</td><td style="border-width:0px">';
                            optionRowHtml += '<input style="width: 50px" data-dojo-type="dijit.form.NumberSpinner" value="' +multiValues[rowKey]['minLength'] + '" data-dojo-props="constraints:{min:0,max:255,places:0}""';
                            optionRowHtml += ' onchange="clientSettingCache[\'' + keyName + '\'][\'' + localeKey + '\'][\'' + rowKey + '\'][\'minLength\'] = this.value;ChallengeTableHandler.write(\'' + keyName + '\')"/> Minimum Length';
                            optionRowHtml += '</td><td style="border-width:0px">';
                            optionRowHtml += '<input style="width: 50px" data-dojo-type="dijit.form.NumberSpinner" value="' +multiValues[rowKey]['maxLength'] + '" data-dojo-props="constraints:{min:0,max:255,places:0}""';
                            optionRowHtml += ' onchange="clientSettingCache[\'' + keyName + '\'][\'' + localeKey + '\'][\'' + rowKey + '\'][\'maxLength\'] = this.value;ChallengeTableHandler.write(\'' + keyName + '\')"/> Maximum Length';
                            optionRowHtml += '</td>';
                            optionRow.innerHTML = optionRowHtml;
                            localeTableElement.appendChild(optionRow);

                        }(iteration));
                    }

                    { // add row button for this locale group
                        var newTableRow = document.createElement("tr");
                        newTableRow.setAttribute("style", "border-width: 0");
                        newTableRow.setAttribute("colspan", "5");

                        var newTableData = document.createElement("td");
                        newTableData.setAttribute("style", "border-width: 0;");

                        var addItemButton = document.createElement("button");
                        addItemButton.setAttribute("type", "[button");
                        addItemButton.setAttribute("onclick", "clientSettingCache['" + keyName + "']['" + localeName + "'].push(" + json.stringify(ChallengeTableHandler.defaultItem) + ");ChallengeTableHandler.write('" + keyName + "',true)");
                        addItemButton.setAttribute("data-dojo-type", "dijit.form.Button");
                        addItemButton.innerHTML = "Add Value";
                        newTableData.appendChild(addItemButton);

                        newTableRow.appendChild(newTableData);
                        localeTableElement.appendChild(newTableRow);
                    }


                    if (localeName != '') { // add remove locale x
                        var imgElement2 = document.createElement("div");
                        imgElement2.setAttribute("style", "width: 12px; height: 12px;");
                        imgElement2.setAttribute("class", "fa fa-times icon_button");
                        imgElement2.setAttribute("onclick", "delete clientSettingCache['" + keyName + "']['" + localeName + "'];ChallengeTableHandler.write('" + keyName + "',true)");
                        var tdElement = document.createElement("td");
                        tdElement.setAttribute("style", "border-width: 0; text-align: left; vertical-align: top;width 10px");

                        localeTableRow.appendChild(tdElement);
                        tdElement.appendChild(imgElement2);
                    }

                    var parentDivElement = PWM_MAIN.getObject(parentDiv);
                    parentDivElement.appendChild(localeTableRow);

                    { // add a spacer row
                        var spacerTableRow = document.createElement("tr");
                        spacerTableRow.setAttribute("style", "border-width: 0");
                        parentDivElement.appendChild(spacerTableRow);

                        var spacerTableData = document.createElement("td");
                        spacerTableData.setAttribute("style", "border-width: 0");
                        spacerTableData.innerHTML = "&nbsp;";
                        spacerTableRow.appendChild(spacerTableData);
                    }
                }(localeName));
            }

            var addLocaleFunction = function() {
                require(["dijit/registry"],function(registry){
                    var localeValue = registry.byId(keyName + "-addLocaleValue").value;
                    clientSettingCache[keyName][localeValue] = [];
                    clientSettingCache[keyName][localeValue][0] = ChallengeTableHandler.defaultItem;
                    ChallengeTableHandler.write(keyName, true);
                });
            };

            addAddLocaleButtonRow(parentDiv, keyName, addLocaleFunction);
            dojoParser.parse(parentDiv);
        });
};

ChallengeTableHandler.handleAdminToggled = function(toggleElement,inputID) {
    require(["dojo","dijit/registry"],function(dojo,registry){
        var inputElement = registry.byId(inputID);
        if (toggleElement.checked) {
            toggleElement.set('label','Admin Defined');
            inputElement.set('disabled',false);
            inputElement.set('value','Question');
        } else {
            toggleElement.set('label','User Defined');
            inputElement.set('disabled',true);
            inputElement.set('value','');
        }
    });
}

ChallengeTableHandler.write = function(settingKey,redraw) {
    writeSetting(settingKey, clientSettingCache[settingKey]);
    if (redraw) {
        var parentDiv = 'table_setting_' + settingKey;
        ChallengeTableHandler.draw(parentDiv, settingKey);
    }
};



// ---------------------- menu bar section ---------------------------------------------------

function buildMenuBar() {
    PWM_MAIN.clearDijitWidget('topMenuBar');
    require(["dojo","dijit","dijit/Menu","dijit/Dialog","dijit/MenuBar","dijit/MenuItem","dijit/MenuBarItem","dijit/PopupMenuBarItem","dijit/CheckedMenuItem","dijit/MenuSeparator"],
        function(dojo,dijit,Menu,Dialog,MenuBar,MenuItem,MenuBarItem,PopupMenuBarItem,CheckedMenuItem,MenuSeparator){
            var topMenuBar = new MenuBar({id:"topMenuBar"});

            var settingsMenu = new Menu({});
            topMenuBar.addChild(new PopupMenuBarItem({
                label: "Settings",
                popup: settingsMenu
            }));

            var profilesMenu = new Menu({});
            topMenuBar.addChild(new PopupMenuBarItem({
                label: "Profiles",
                popup: profilesMenu
            }));

            var modulesMenu = new Menu({});
            topMenuBar.addChild(new PopupMenuBarItem({
                label: "Modules",
                popup: modulesMenu
            }));

            { // Settings & Modules Menu
                for (var category in PWM_SETTINGS['categories']) {
                    (function(loopCategory) {
                        var menuCategory = PWM_SETTINGS['categories'][loopCategory];
                        var settingInfo = {};

                        var showMenu = true;
                        if (menuCategory['key'] == 'EDIRECTORY') {
                            showMenu = (PWM_GLOBAL['selectedTemplate'] == 'NOVL');
                        }
                        if (menuCategory['key'] == 'ACTIVE_DIRECTORY') {
                            showMenu = (PWM_GLOBAL['selectedTemplate'] == 'AD');
                        }
                        if (menuCategory['hidden'] == true) {
                            showMenu = false;
                        }

                        var allowMenuSelect = true;
                        if (PWM_GLOBAL['applicationMode'] == 'CONFIGURATION') {
                            if (menuCategory['key'] != 'LDAP') {
                                allowMenuSelect = true;

                            }
                        }

                        var currentSelection = preferences['editMode'] == 'SETTINGS' && menuCategory['key'] == preferences['category'];


                        if (showMenu) {
                            if (currentSelection) {
                                settingInfo = {
                                    label: menuCategory['label'],
                                    disabled: true
                                };
                            } else {
                                settingInfo = {
                                    label: menuCategory['label'],
                                    onClick: function() {
                                        if (allowMenuSelect) {
                                            gotoSetting(menuCategory['key']);
                                        } else {
                                            var message = (PWM_SETTINGS['display']['Warning_ConfigMustBeClosed']).replace("%1%",PWM_GLOBAL['url-context'] + "/private/config/ConfigManager")
                                            PWM_MAIN.showDialog('Notice',message);
                                        }
                                    }
                                };
                            }
                            if (menuCategory['type'] == "SETTING") {
                                settingsMenu.addChild(new MenuItem(settingInfo));
                            } else if (menuCategory['type'] == "PROFILE") {
                                profilesMenu.addChild(new MenuItem(settingInfo));
                            } else {
                                modulesMenu.addChild(new MenuItem(settingInfo));
                            }
                        }
                    })(category);
                }
            }
            { // Display menu
                var displayMenu = new Menu({});
                topMenuBar.addChild(new PopupMenuBarItem({
                    label: "Custom Text",
                    popup: displayMenu
                }));

                for (var localeMenu in PWM_SETTINGS['locales']) {
                    (function(localeMenu) {
                        var localeKey = PWM_SETTINGS['locales'][localeMenu]['key'];
                        if (preferences['editMode'] == 'LOCALEBUNDLE' && preferences['localeBundle'] == localeKey) {
                            displayMenu.addChild(new MenuItem({
                                label: localeMenu,
                                disabled: true
                            }));
                        } else {
                            displayMenu.addChild(new MenuItem({
                                label: localeMenu,
                                onClick: function() {
                                    PWM_MAIN.showWaitDialog(null,null,function(){
                                        preferences['editMode'] = 'LOCALEBUNDLE';
                                        preferences['localeBundle'] = localeKey;
                                        setConfigEditorCookie();
                                        loadMainPageBody();
                                    });
                                }
                            }));
                        }
                    })(localeMenu);
                }
            }
            {
                topMenuBar.addChild(
                    new MenuBarItem({
                        label: " | ",
                        disabled: true
                    }));
            }
            { // view menu
                var viewMenu = new Menu({});
                var advancedIsChecked = preferences['level'] && preferences['level'] > 1;
                viewMenu.addChild(new CheckedMenuItem({
                    label: "Always Show Advanced Settings",
                    checked: advancedIsChecked,
                    onClick: function() {
                        preferences['level'] = advancedIsChecked ? 1 : 2;
                        setConfigEditorCookie();
                        loadMainPageBody();
                    }
                }));
                viewMenu.addChild(new CheckedMenuItem({
                    label: "Auto-Expand Help Text",
                    checked: preferences['showDesc'],
                    onClick: function() {
                        PWM_MAIN.showWaitDialog(null,null,function(){
                            preferences['showDesc'] = !preferences['showDesc'];
                            setConfigEditorCookie();
                            loadMainPageBody();
                        });
                    }
                }));
                viewMenu.addChild(new MenuSeparator());
                viewMenu.addChild(new MenuItem({
                    label: "Search Settings",
                    onClick: function() {
                        searchDialog();
                    }
                }));
                viewMenu.addChild(new MenuSeparator());
                viewMenu.addChild(new MenuItem({
                    label: "Configuration Notes",
                    onClick: function() {
                        showConfigurationNotes();
                    }
                }));
                viewMenu.addChild(new MenuItem({
                    label: "Macro Help",
                    onClick: function() {
                        var idName = 'dialogPopup';
                        PWM_MAIN.clearDijitWidget(idName);
                        var theDialog = new Dialog({
                            id: idName,
                            title: 'Macro Help',
                            style: "width: 550px",
                            href: PWM_GLOBAL['url-resources'] + "/text/macroHelp.html"
                        });
                        theDialog.show();
                    }
                }));
                viewMenu.addChild(new MenuSeparator());
                viewMenu.addChild(new MenuItem({
                    label: "Changes",
                    onClick: function() {
                        showChangeLog();
                    }
                }));

                topMenuBar.addChild(new PopupMenuBarItem({
                    label: "View",
                    popup: viewMenu
                }));
            }

            { // Templates
                var templateMenu = new Menu({});
                var confirmText = 'Are you sure you want to change the default settings template?  \n\nIf you proceed, be sure to closely review the resulting configuration as any settings using default values may change.';
                for (var template in PWM_SETTINGS['templates']) {
                    (function() {
                        var templateItem = PWM_SETTINGS['templates'][template];
                        templateMenu.addChild(new CheckedMenuItem({
                            label: templateItem['description'],
                            checked: templateItem['key'] == PWM_GLOBAL['selectedTemplate'],
                            onClick: function() {
                                PWM_MAIN.showConfirmDialog(null,confirmText,function(){
                                    PWM_MAIN.showWaitDialog(null,null,function(){
                                        dojo.xhrGet({
                                            url:"ConfigEditor?processAction=setOption&pwmFormID=" + PWM_GLOBAL['pwmFormID'] + "&template=" + templateItem['key'],
                                            preventCache: true,
                                            error: function(errorObj) {
                                                PWM_MAIN.showError("error loading " + keyName + ", reason: " + errorObj)
                                            },
                                            load: function() {
                                                loadMainPageBody();
                                            }
                                        });
                                    });
                                });
                            }
                        }));
                    })();
                };
                templateMenu.addChild(new MenuSeparator());
                templateMenu.addChild(new MenuItem({
                    label: "About Templates",
                    onClick: function() {
                        var idName = 'dialogPopup';
                        PWM_MAIN.clearDijitWidget(idName);
                        var theDialog = new Dialog({
                            id: idName,
                            title: 'About Templates',
                            style: "width: 550px",
                            href: PWM_GLOBAL['url-resources'] + "/text/aboutTemplates.html"
                        });
                        theDialog.show();
                    }
                }));

                topMenuBar.addChild(new PopupMenuBarItem({
                    label: "Template",
                    popup: templateMenu
                }));
            }
            {
                topMenuBar.addChild(
                    new MenuBarItem({
                        label: " | ",
                        disabled: true
                    }));
            }
            { // Actions
                var actionsMenu = new Menu({});
                actionsMenu.addChild(new MenuItem({
                    label: "Set Configuration Password",
                    onClick: function() {
                        setConfigurationPassword();
                    }
                }));
                actionsMenu.addChild(new MenuSeparator());
                actionsMenu.addChild(new MenuItem({
                    label: "Save",
                    iconClass: "dijitEditorIcon dijitEditorIconSave",
                    onClick: function() {
                        saveConfiguration(true);
                    }
                }));
                actionsMenu.addChild(new MenuItem({
                    label: "Cancel",
                    iconClass: "dijitEditorIcon dijitEditorIconCancel",
                    onClick: function() {
                        document.forms['cancelEditing'].submit();
                    }
                }));

                topMenuBar.addChild(new PopupMenuBarItem({
                    label: "Actions",
                    popup: actionsMenu
                }));
            }
            topMenuBar.placeAt("TopMenu");
            topMenuBar.startup();
        });
}

function readInitialTextBasedValue(key) {
    require(["dijit/registry"],function(registry){
        readSetting(key, function(dataValue) {
            PWM_MAIN.getObject('value_' + key).value = dataValue;
            PWM_MAIN.getObject('value_' + key).disabled = false;
            registry.byId('value_' + key).set('disabled', false);
            registry.byId('value_' + key).startup();
            try {registry.byId('value_' + key).validate(false);} catch (e) {}
            try {registry.byId('value_verify_' + key).validate(false);} catch (e) {}
        });
    });
}

function saveConfiguration(waitForReload) {
    PWM_MAIN.showWaitDialog(null,null,function(){
        require(["dojo","dojo/json"],function(dojo,json){
            dojo.xhrGet({
                url:"ConfigEditor?processAction=readChangeLog&pwmFormID=" + PWM_GLOBAL['pwmFormID'],
                headers: {"Accept":"application/json"},
                contentType: "application/json;charset=utf-8",
                encoding: "utf-8",
                handleAs: "json",
                dataType: "json",
                preventCache: true,
                load: function(data){
                    PWM_MAIN.closeWaitDialog();
                    if (data['error']) {
                        PWM_MAIN.showDialog("Error",data['errorMessage'])
                    } else {
                        var bodyText = '<div style="max-width: 590px;">';
                        bodyText += PWM_SETTINGS['display']['MenuDisplay_SaveConfig'];
                        bodyText += '<pre style="white-space: pre-wrap; word-wrap: break-word">';
                        bodyText += data['data'];
                        bodyText +='</pre></div>';
                        PWM_MAIN.showConfirmDialog(
                            null,
                            bodyText,
                            function(){
                                PWM_MAIN.showWaitDialog('Saving Configuration...', null, function(){
                                    require(["dojo"],function(dojo){
                                        dojo.xhrGet({
                                            url:"ConfigEditor?processAction=finishEditing&pwmFormID=" + PWM_GLOBAL['pwmFormID'],
                                            preventCache: true,
                                            dataType: "json",
                                            handleAs: "json",
                                            load: function(data){
                                                if (data['error'] == true) {
                                                    PWM_MAIN.closeWaitDialog();
                                                    PWM_MAIN.showError(data['errorDetail']);
                                                } else {
                                                    if (waitForReload) {
                                                        var currentTime = new Date().getTime();
                                                        PWM_MAIN.showError('Waiting for server restart');
                                                        PWM_CONFIG.waitForRestart(currentTime);
                                                    } else {
                                                        window.location = "ConfigManager";
                                                    }
                                                }
                                            }
                                        });
                                    });
                                });
                            }
                        );
                    }
                },
                error: function(errorObj) {
                    PWM_MAIN.closeWaitDialog();
                    PWM_MAIN.showError("error executing function: " + errorObj);
                }
            });
        });
    });

}


function readConfigEditorCookie() {
    require(['dojo/json','dojo/cookie'], function(json,dojoCookie){
        try {
            preferences = json.parse(dojoCookie("preferences"));
        } catch (e) {
            console.log("error reading preferences cookie: " + e);
        }
    });
}

function setConfigEditorCookie() {
    require(['dojo/json','dojo/cookie'], function(json,dojoCookie){
        var cookieString = json.stringify(preferences);
        dojoCookie("preferences", cookieString, {expires: 5}); // 5 days
    });
}

function setConfigurationPassword(password) {
    if (password) {
        PWM_MAIN.clearDijitWidget('dialogPopup');
        PWM_MAIN.showWaitDialog();
        dojo.xhrPost({
            url:"ConfigEditor?processAction=setConfigurationPassword&pwmFormID=" + PWM_GLOBAL['pwmFormID'],
            postData: password,
            contentType: "application/text;charset=utf-8",
            dataType: "text",
            handleAs: "text",
            load: function(data){
                PWM_MAIN.closeWaitDialog();
                PWM_MAIN.showInfo('Configuration password set successfully.')
            },
            error: function(errorObj) {
                PWM_MAIN.closeWaitDialog();
                PWM_MAIN.showError("error saving notes text: " + errorObj);
            }
        });
        return;
    }

    var writeFunction = 'setConfigurationPassword(PWM_MAIN.getObject(\'password1\').value)';
    ChangePasswordHandler.init('configPw','Configuration Password',writeFunction);
}

function toggleHelpDisplay(nodeId) {
    var node = PWM_MAIN.getObject(nodeId);
    if (node) {
        if (node.style.display == 'block') {
            node.style.display = 'none';
        } else {
            node.style.display = 'block';
        }
    }
}

function showConfigurationNotes() {
    var idName = 'configNotesDialog';
    var bodyText = '<textarea cols="40" rows="10" style="width: 575px; height: 300px; resize:none" onchange="writeConfigurationNotes()" id="' + idName + '">';
    bodyText += PWM_STRINGS['Display_PleaseWait'];
    bodyText += '</textarea>';
    bodyText += '<button onclick="writeConfigurationNotes()" class="btn">' + PWM_MAIN.showString('Button_OK') + '</button>';

    PWM_MAIN.clearDijitWidget('dialogPopup');
    require(["dijit/Dialog"],function(Dialog){
        var theDialog = new Dialog({
            id: 'dialogPopup',
            title: 'Configuration Notes',
            style: "width: 600px;",
            content: bodyText
        });
        theDialog.show();
        PWM_MAIN.getObject(idName).value = PWM_GLOBAL['configurationNotes'];
        preferences['seenNotes'] = true;
        setConfigEditorCookie();
    });
}

function writeConfigurationNotes() {
    require(["dojo","dijit/Dialog"],function(dojo){
        var value = PWM_MAIN.getObject('configNotesDialog').value;
        PWM_GLOBAL['configurationNotes'] = value;
        PWM_MAIN.showWaitDialog();
        dojo.xhrPost({
            url:"ConfigEditor?processAction=setOption&pwmFormID=" + PWM_GLOBAL['pwmFormID'] + "&updateNotesText=true",
            postData: dojo.toJson(value),
            contentType: "application/json;charset=utf-8",
            dataType: "json",
            handleAs: "text",
            load: function(){
                loadMainPageBody();
            },
            error: function(errorObj) {
                PWM_MAIN.closeWaitDialog();
                alert("error saving notes text: " + errorObj);
                loadMainPageBody();
            }
        });
    });
}

function loadMainPageBody() {
    window.location.replace(PWM_GLOBAL['url-context'] + '/private/config/ConfigEditor');
}

function handleResetClick(settingKey) {
    var label = PWM_SETTINGS['settings'][settingKey] ? PWM_SETTINGS['settings'][settingKey]['label'] : null;

    var dialogText = 'Are you sure you want to reset the setting ';
    if (label) {
        dialogText += '<span style="font-style: italic;">' + PWM_SETTINGS['settings'][settingKey]['label'] + '</span>';
    }
    dialogText += ' to the default value?';

    var title = 'Reset ' + label ? label : '';

    PWM_MAIN.showConfirmDialog(title,dialogText,function(){
        resetSetting(settingKey);
        loadMainPageBody();
    });
}

function initConfigEditor(nextFunction) {
    readConfigEditorCookie();
    buildMenuBar();

    var hasNotes = PWM_GLOBAL['configurationNotes'] && PWM_GLOBAL['configurationNotes'].length > 0;

    if (hasNotes && preferences['notesSeen']) {
        showPwmAlert(null,PWM_SETTINGS['display']['Warning_ShowNotes']);
    }

    if (nextFunction) {
        nextFunction();
    }
}

function executeSettingFunction(setting, profile, name) {
    var jsonSendData = {};
    jsonSendData['setting'] = setting;
    jsonSendData['profile'] = profile;
    jsonSendData['function'] = name;

    PWM_MAIN.showWaitDialog(null,null,function(){
        require(["dojo","dojo/json"],function(dojo,json){
            dojo.xhrPost({
                url:"ConfigEditor?processAction=executeSettingFunction&pwmFormID=" + PWM_GLOBAL['pwmFormID'],
                postData: json.stringify(jsonSendData),
                headers: {"Accept":"application/json"},
                contentType: "application/json;charset=utf-8",
                encoding: "utf-8",
                handleAs: "json",
                dataType: "json",
                preventCache: true,
                load: function(data){
                    PWM_MAIN.closeWaitDialog();
                    if (data['error']) {
                        PWM_MAIN.showDialog("Error",data['errorMessage'])
                    } else {
                        PWM_MAIN.showDialog("Success",data['successMessage'],function(){
                            loadMainPageBody();
                        });
                    }
                },
                error: function(errorObj) {
                    PWM_MAIN.closeWaitDialog();
                    PWM_MAIN.showError("error executing function: " + errorObj);
                }
            });
        });
    });
}

function showChangeLog() {
    PWM_MAIN.showWaitDialog(null,null,function(){
        require(["dojo","dojo/json"],function(dojo,json){
            dojo.xhrGet({
                url:"ConfigEditor?processAction=readChangeLog&pwmFormID=" + PWM_GLOBAL['pwmFormID'],
                headers: {"Accept":"application/json"},
                contentType: "application/json;charset=utf-8",
                encoding: "utf-8",
                handleAs: "json",
                dataType: "json",
                preventCache: true,
                load: function(data){
                    PWM_MAIN.closeWaitDialog();
                    if (data['error']) {
                        PWM_MAIN.showDialog("Error",data['errorMessage'])
                    } else {
                        var bodyText = '<div style="max-width: 590px;"><pre style="white-space: pre-wrap; word-wrap: break-word">';
                        bodyText += data['data'];
                        bodyText +='</pre></div>';
                        PWM_MAIN.showDialog("Unsaved Configuration Editor Changes",bodyText);
                    }
                },
                error: function(errorObj) {
                    PWM_MAIN.closeWaitDialog();
                    PWM_MAIN.showError("error executing function: " + errorObj);
                }
            });
        });
    });
}

function searchDialog(reentrant) {
    if (reentrant) {
        var validationProps = {};
        validationProps['serviceURL'] = "ConfigEditor?processAction=search";
        validationProps['readDataFunction'] = function(){ return {search:PWM_MAIN.getObject('settingSearchInput').value}}
        validationProps['typeWaitTimeMs'] = 50;
        validationProps['messageWorking'] = "Searching...";
        validationProps['processResultsFunction'] = function(data) {
            if (data['error']) {
                try { PWM_MAIN.getObject('message').id = "base-message"; } catch (e) {}
                PWM_MAIN.showDialog("Error",data['errorMessage'])
            } else {
                var bodyText = '';
                var resultCount = 0;
                if (PWM_MAIN.isEmpty(data['data'])) {
                    PWM_MAIN.showSuccess(PWM_STRINGS['Display_SearchResultsNone']);
                } else {
                    for (var categoryIter in data['data']) {
                        var category = data['data'][categoryIter];
                        bodyText += '<span style="font-weight: bold">' + categoryIter + '</span><br/>';
                        for (var settingIter in category) {
                            var setting = category[settingIter];
                            var profileID = setting['profile'];
                            var functionText;
                            if (profileID) {
                                functionText = 'gotoSetting(\'' + setting['category'] + '\',\'' + settingIter + '\',\'' + profileID + '\')';
                            } else {
                                functionText = 'gotoSetting(\'' + setting['category'] + '\',\'' + settingIter + '\')';
                            }

                            bodyText += '<span>&nbsp;&nbsp;</span>';
                            var settingID = "search_" + (profileID ? profileID + '_' : '') +  settingIter;
                            bodyText += '<span id="' + settingID + '" style="text-indent: 1.5em; margin-left 10px; cursor: pointer; text-decoration: underline" onclick="' + functionText + '">';
                            bodyText += setting['label'];
                            bodyText += '</span><br/>';
                            resultCount++;
                        }
                    }
                }
                PWM_MAIN.getObject('settingSearchResults').innerHTML = bodyText;
                if (!PWM_MAIN.isEmpty(data['data'])) {
                    (function(){
                        require(["dijit/Tooltip"],function(Tooltip){
                            for (var categoryIter in data['data']) {
                                var category = data['data'][categoryIter];
                                for (var settingIter in category) {
                                    var setting = category[settingIter];
                                    var profileID = setting['profile'];
                                    var settingID = "search_" + (profileID ? profileID + '_' : '') +  settingIter;
                                    var toolBody = '<div style="max-width: 650px"><span style="font-weight: bold">Setting</span>';
                                    toolBody += '<br/>' + setting['label'] + '<br/><br/>';
                                    toolBody += '<span style="font-weight: bold">Description</span>';
                                    toolBody += '<br/>' + setting['description'] + '<br/><br/>';
                                    toolBody += '<span style="font-weight: bold">Value</span>';
                                    toolBody += '<br/>' + setting['value'] + '<br/></div>';
                                    new Tooltip({
                                        connectId: [settingID],
                                        label: toolBody,
                                        position: ['above']
                                    });
                                }
                            }
                        });
                    }());
                }
                PWM_MAIN.showSuccess(resultCount + ' Results');
            }
        };
        PWM_MAIN.getObject('settingSearchResults').innerHTML = '<div id="WaitDialogBlank" style="vertical-align: middle"/>';
        PWM_MAIN.getObject('settingSearchResults').click();
        PWM_MAIN.pwmFormValidator(validationProps);
    } else {
        var htmlBody = '<div>';
        htmlBody += '<span id="message" class="message message-info" style="width: 400">Search setting names, descriptions and values.</span><br/>';
        htmlBody += '<input type="search" id="settingSearchInput" style="width: 400px" onkeyup="searchDialog(true)"/>';
        htmlBody += '<br/><br/>';
        htmlBody += '<div id="settingSearchResults" style="max-height: 200px; min-height: 200px;overflow-y: auto"></div>';
        htmlBody += '<br/><br/><button class="btn" onclick="PWM_MAIN.closeWaitDialog();PWM_MAIN.getObject(\'base-message\').id = \'message\'">Ok</button>';
        htmlBody += '</div>';
        try { PWM_MAIN.getObject('message').id = "base-message"; } catch (e) {}
        var theDialog = new dijit.Dialog({
            id: 'dialogPopup',
            title: 'Search Settings',
            style: "width: 500px",
            content: htmlBody,
            hide: function(){
                PWM_MAIN.closeWaitDialog();
                PWM_MAIN.getObject('base-message').id = "message";
            }
        });
        theDialog.show();
    }
}

function gotoSetting(category,settingKey,profile) {
    console.log('going to setting...');
    PWM_MAIN.showWaitDialog(null,null,function(){
        preferences['editMode'] = 'SETTINGS';
        preferences['category'] = category;
        preferences['setting'] = settingKey ? settingKey : '';
        if (profile) {
            preferences['profile'] = profile;
        }
        setConfigEditorCookie();
        loadMainPageBody();
    });
}

function initSettingTooltip(options) {
    require(["dijit","dijit/Tooltip"],function(dijit,Tooltip){
        new Tooltip({
            connectId: [options['id']],
            position: ['above','below'],
            label: '<div style="max-width:620px">' + options['text'] + '</div>'
        });
    });
}
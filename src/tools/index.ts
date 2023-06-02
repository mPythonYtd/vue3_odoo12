import {callNames, callOnchange, callFields, callRead, callSearchRead} from "../service/module/call";
import {
    RequestParamsType,
    ModuleDataType,
    FieldOptionType,
    OnchangeParamsType,
    Multiple
} from "../types";

import {ElMessage} from "element-plus";

// 请求数据
const getRequestParams = (params: ModuleDataType): RequestParamsType => {
    let id = params.id instanceof Array && params.id || [params.id];
    return {
        model: params.model,
        args: [id, params.fields]
    }
}
const onchangeField = async (params: OnchangeParamsType) => {
    let options = params.options;
    let datas = params.datas
    let field = params.field;
    let treeDatas = params.treeDatas;
    if (options[field].onchange) {
        let onchange: { [prop: string]: '' | '1' } = {};
        let changedData: { [prop: string]: Multiple } = {}
        for (let field of Object.keys(datas || {})) {
            onchange[field] = options[field]?.onchange ? '1' : '';
            changedData[field] = datas[field];
        }
        const model = params.model;
        let request: RequestParamsType = {
            model: model,
            method: 'onchange',
            args: [[datas.id || 0], changedData, field, onchange, {
                'lang': 'zh_CN',
                'tz': false,
                'uid': 1,
                front: true
            }],
            path: model + '/onchange'
        }
        const res = await callOnchange(request)
        if (res.error) {
            ElMessage({
                message: res.error.data.message,
                type: 'error'
            });
            return false
        }
        const result = res.result;
        const domain = result.domain;
        const value = result.value

        if (result.warning) {
            ElMessage({
                message: result.warning.message,
                type: 'error'
            });
            return false;
        }
        for (let changedField of Object.keys(domain || {})) {
            options[changedField].domain = domain[changedField];
            options[changedField].selection = [];
            if (datas[changedField] instanceof Array) {
                datas[changedField] = [];
                continue
            }
            datas[changedField] = ''
        }
        for (let changedField of Object.keys(value || {})) {
            if (value[changedField] instanceof Array) {
                options[changedField].selection.push(value[changedField])
                datas[changedField] = value[changedField][0]
                continue
            }
            if (value[changedField] === false && options[changedField].type !== 'boolean') {
                datas[changedField] = ''
                if (['float', 'integer'].indexOf(options[changedField].type) !== -1) {
                    datas[changedField] = 0
                }
                continue
            }
            if (!!Object.keys(treeDatas || {}).length && Object.keys(treeDatas || {}).indexOf(changedField) !== -1) {
                treeDatas[changedField] = value[changedField]
                continue
            }
            datas[changedField] = value[changedField]
        }
    }
    if (params.form?.datas) {
        onchangeField(params.form);
    }
}
const loadFormDatas = async (params: ModuleDataType) => {
    let requestParams = getRequestParams(params)
    const res = await callFields(requestParams);
    if (res.error) {
        ElMessage({
            message: res.error.data.message,
            type: 'error'
        });
        return false
    }
    let formFieldsOption = res.result;
    let treeFieldsOption = {}
    for (let line of Object.keys(params.tables || {})) {
        const result = await callFields(getRequestParams(params.tables[line]));
        treeFieldsOption[line] = result.result;
    }
    const dataRes = await callRead(requestParams);
    if (dataRes.error) {
        ElMessage({
            message: dataRes.error.data.message,
            type: 'error'
        });
        return false
    }
    let treeDatas = {}
    let tableDataCountMap = {}
    for (let line of Object.keys(params.tables || {})) {
        let lineParams = params.tables[line] || {};
        lineParams.id = dataRes.result?.length && dataRes.result[0][line];
        let dataResult
        if (lineParams.domain && lineParams.domain.length) {
            let requestData: RequestParamsType = {
                model: lineParams.model,
                fields: lineParams.fields,
                domain: lineParams.domain.concat([['id', 'in', lineParams.id]]),
                offset: 0,
                limit: false,
                sort: lineParams.sort
            }
            const result = await callSearchRead(requestData)
            if (result.error) {
                ElMessage({
                    message: result.error.data.message,
                    type: 'error'
                });
                return false
            }
            dataResult = result.result.records
        } else {
            const result = await callRead(getRequestParams(params.tables[line]));
            if (result.error) {
                ElMessage({
                    message: result.error.data.message,
                    type: 'error'
                });
                return false
            }
            dataResult = result.result;
        }
        treeDatas[line] = JSON.parse(JSON.stringify(dataResult || {}));
        tableDataCountMap[line] = treeDatas[line].length || 0
    }
    let formData = dataRes?.result?.length && JSON.parse(JSON.stringify(dataRes.result[0])) || {};
    if (!Object.keys(formData || {}).length) {
        for (let field of Object.keys(formFieldsOption || {})) {   // 设置空数据
            formData[field] = ''
        }
    }
    return {
        formFieldsOption,
        treeFieldsOption,
        formData,
        treeDatas,
        tableDataCountMap,
    }
}
const loadTreeData = async (params: ModuleDataType) => {
    let requestParams = getRequestParams(params)
    const res = await callFields(requestParams);
    if (res.error) {
        ElMessage({
            message: res.error.data.message,
            type: 'error'
        });
        return false
    }
    let treeFieldsOption = res.result;

    let requestData: RequestParamsType = {
        model: params.model,
        fields: params.fields,
        offset: params.offset || 0,
        limit: params.limit,
        domain: params.domain,
        sort: params.sort
    }
    const dataRes = await callSearchRead(requestData);

    if (dataRes.error) {
        ElMessage({
            message: dataRes.error.data.message,
            type: 'error'
        });
        return false
    }
    let listData = JSON.parse(JSON.stringify(dataRes?.result?.records || []));
    const count = dataRes?.result?.length || 0;
    return {
        treeFieldsOption,
        listData,
        count
    }
}
const searchFieldSelection = async (option: FieldOptionType, query: string, domain = []) => {
    const res = await callNames({
        model: option.relation,
        args: [],
        kwargs: {
            'name': query.trim(),
            'args': option.domain.concat(domain) || [],
            'operator': 'ilike',
            'limit': 8,
            'context': {'lang': 'zh_CN', 'tz': false, 'uid': 2, 'front': true}
        }
    })
    option.selection = res.result || [];
    return true;
}

//  文件处理
const contentTypeMap: Map<string, string> = new Map([
    ['.html', 'text/html'],
    ['.css', 'text/css'],
    ['.js', 'application/javascript'],
    ['.json', 'application/json'],
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.png', 'image/png'],
    ['.gif', 'image/gif'],
    ['.bmp', 'image/bmp'],
    ['.svg', 'image/svg+xml'],
    ['.ico', 'image/x-icon'],
    ['.pdf', 'application/pdf'],
    ['.mp3', 'audio/mpeg'],
    ['.wav', 'audio/wav'],
    ['.mp4', 'video/mp4'],
    ['.zip', 'application/zip'],
    ['.rar', 'application/x-rar-compressed'],
    ['.exe', 'application/x-msdownload'],
    ['.cab', 'application/vnd.ms-cab-compressed'],
    ['.ttf', 'font/ttf'],
    ['.otf', 'font/otf'],
    ['.xls', 'application/vnd.ms-excel'],
    ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
]);
const getFileType = (filename: string): string | undefined => {
    const extension = '.' + filename.split('.').pop();
    return contentTypeMap.get(extension.toLowerCase());
};
const base64ToBlobUrl = (base64: string, filename: string): Promise<string> => {
    if (!base64.length) {
        throw new Error('The base64 string is empty.');
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            const binary = new Uint8Array(arrayBuffer);
            const fileType = getFileType(filename);
            const blob = new Blob([binary], {type: fileType});
            const url = URL.createObjectURL(blob);
            resolve(url);
        };
        reader.onerror = (event) => {
            reject(event.target?.error);
        };
        const byteArray = new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
        reader.readAsArrayBuffer(new Blob([byteArray]));
    });
};
const downLoadFile = (base64File: string, filename: string) => async () => {
    if (base64File.length) {
        try {
            // 获取 Blob URL
            const href = await base64ToBlobUrl(base64File, filename);
            // 创建下载链接
            const downloadElement = document.createElement('a');
            downloadElement.href = href;
            downloadElement.download = filename; //下载后文件名
            document.body.appendChild(downloadElement);
            downloadElement.click(); //点击下载
            document.body.removeChild(downloadElement); //下载完成移除元素
            URL.revokeObjectURL(href); //释放掉blob对象
        } catch (e) {
            console.error(e);
        }
    }
};
const encodeFileToBase64 = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = function (error) {
            reject(error);
        };
    });
}

// 解析domain
const getDomainVal = (domains, data) => {
    let domainsCopy = JSON.parse(JSON.stringify(domains))
    for (let index = 0; index < domainsCopy.length; index++) {
        let domain = domainsCopy[index]
        if (domain.length === 3) {
            const field = domain[0];
            const operator = domain[1];
            const value = domain[2];
            let fieldVal = data[field]
            if (field.includes('.')) {
                const fields = field.split('.');
                let value = data
                for (const field of fields) {
                    value = value[field];
                }
                fieldVal = value;
            }
            let expr = '';
            switch (operator) {
                case '=':
                    expr = fieldVal == value;
                    break;
                case '!=':
                    expr = fieldVal != value;
                    break;
                case '>':
                    expr = fieldVal > value;
                    break;
                case '>=':
                    expr = fieldVal >= value;
                    break;
                case '<':
                    expr = fieldVal < value;
                    break;
                case '<=':
                    expr = fieldVal <= value;
                    break;
                case 'in':
                    expr = Array.isArray(value) && value.includes(fieldVal);
                    break;
                case 'not in':
                    expr = Array.isArray(value) && !value.includes(fieldVal);
                    break;
                case 'ilike':
                    expr = fieldVal.toString().toLowerCase().includes(value.toLowerCase());
                    break;
                case 'child_of':
                    expr = fieldVal.some(id => id === value || data[id] && fieldVal.includes(data[id].parent_id));
                    break;
            }
            domainsCopy[index] = expr
        }
    }
    return domainsCopy
}
const parseDomain = (domains, data) => {
    let domainStack = getDomainVal(domains, data);
    const length = domainStack.length
    for (let index = length - 1; index >= 0; index--) {
        let domain = domainStack[index];
        if (domain === '|') {
            if (domainStack[index + 1] !== 'undefined' && domainStack[index + 2] !== 'undefined') {
                domain = domainStack[index + 1] || domainStack[index + 2];
                domainStack.splice(index + 1, 1);
                domainStack.splice(index + 1, 1);
                domainStack[index] = domain
                continue
            } else {
                throw Error('domain不合法!')
            }
        }
        if (domain === '&') {
            if (domainStack[index + 1] !== 'undefined' && domainStack[index + 2] !== 'undefined') {
                domain = domainStack[index + 1] && domainStack[index + 2];
                domainStack.splice(index + 1, 1);
                domainStack.splice(index + 1, 1);
                domainStack[index] = domain
            } else {
                throw Error('domain不合法!')
            }
        }
    }
    return domainStack.every(item => Boolean(item));
}

export {
    searchFieldSelection, onchangeField,
    getFileType, loadFormDatas,
    base64ToBlobUrl, loadTreeData,
    downLoadFile,
    encodeFileToBase64,
    parseDomain
}


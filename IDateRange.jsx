import React, { useMemo, useEffect } from 'react';
import { formily } from '@chaoswise/ui/formily';
import { getEnumField } from '../../../constants/fields';
import { schema } from './schema';
import { filterFields } from '../../utils';
import { quoteFieldFormInit } from '../../utils';
const {
  SchemaForm,
  createAsyncFormActions,
  FormEffectHooks,
  FormPath,
  connect,
  mapStyledProps
} = formily;

const {
  onFormInit$, // 表单初始化触发
  onFieldInputChange$, // 字段事件触发时触发，用于只监控人工操作
  onFormInputChange$
} = FormEffectHooks;

const IDate = ({ defaultValue, handleEffects, setCurrentSettingCompAction,schemaMap, errorMsg, isTableItem=false, formEditChange, errors, updateErrors, ...rest }) => {

  const { modified, isPublic=false, fieldCode, quoteFrom, rangeType, editFieldName} = defaultValue;
  const actions = useMemo(() => createAsyncFormActions(), []);   // 表单行为对象
  const _schema = useMemo(() => filterFields(schema,isTableItem), []);
  const {fieldManagement = false, publicFieldManagement=false, isNewColumn=true} = rest;

  if(fieldManagement && !publicFieldManagement){
    
    // curd状态，移除这两个
    actions.setFieldState('*(fieldName,publicFieldName)', (state) => {
      state.visible = false;
    })
  }else{
    actions.setFieldState('*(fieldName,publicFieldName)', (state) => {
      state.visible = true;
    })
  }
  if (modified || isPublic || !isNewColumn) {
    // 编辑态或公共字段新增，不可编辑fieldcode
    actions.setFieldState('fieldCode', (state) => {
      state.editable = false;
    })
  }

  if((!modified && !isPublic && !publicFieldManagement) || (modified && isPublic === false  && !publicFieldManagement)){
    actions.setFieldState('*(publicFieldName)', (state) => {
      state.visible = false;
    })
  }

  if (isPublic && !fieldManagement) {
    // 拥有公共字段属性不可编辑，公共字段管理需要编辑
    actions.setFieldState('*(publicFieldName)', (state) => {
      state.editable = false;
    })
  }

  if(editFieldName === false){
    actions.setFieldState('*(fieldName)', (state) => {
      state.editable = false;
    })
  }

  if(publicFieldManagement && !fieldManagement){
    actions.setFieldState('*(publicFieldName)', (state) => {
      state.editable = false;
    })
  }

  if(publicFieldManagement && !isTableItem){
    actions.setFieldState('*(fieldName,publicFieldName)', (state) => {
      state.visible = false;
    })
  }
  
  // 引用字段带出的字段、只允许编辑提示、宽度、是否允许复制
  if(quoteFrom) {
    actions.setFieldState('*', (state) => {
      state.editable = false;
    })
    actions.setFieldState('*(fieldHint,fieldWidth,supportCopy)', (state) => {
      state.editable = true;
    })
    // 新数据表的引用带出字段不支持复制
    quoteFieldFormInit(actions, defaultValue)
  }

  if(!rangeType) {
    actions.setFieldState('rangeType', (state) => {
      state.value = 'CUSTOM';
    })
  }

  useEffect(() => {
    const { fieldProperty, rspDesc } = errorMsg || {};
    const field = fieldProperty == 'range' ? 'dateRange' : fieldProperty;
    actions && actions.setFieldState(field, state => {
      state.errors = rspDesc;
    });
  },[errorMsg]);

  useEffect(() => {
    setCurrentSettingCompAction(actions, fieldCode)
  }, [])

  if(isTableItem && !isPublic && !publicFieldManagement){
    actions.setFieldState('*(publicFieldName)', (state) => {
      state.visible = false;
    })
  }

  const getUtil = () => {
    return {
      schemaMap,
      actions,
      itemSchema: defaultValue,
      formEditChange,
      isTableCol: isTableItem,
      errors, // 表格-单行文本校验的错误信息
      updateErrors
    }
  }

  return <div>
    <SchemaForm
      actions={actions}
      labelAlign={'left'}
      schema={_schema}
      defaultValue={defaultValue}
      components={{
        ...getEnumField(
          connect,
          mapStyledProps,
          getUtil
        )
      }}
      effects={() => {
        handleEffects(onFormInputChange$);
      }}
    />
  </div>
}

export default IDate;

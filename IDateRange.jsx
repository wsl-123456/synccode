// 导入必要的依赖
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DatePicker, Icon } from '@chaoswise/ui';
import moment from 'moment';
import {
  EnumDateFormatType,
  EnumDateFormatRule,
  EnumDateFormatRuleSimple
} from '../../../constants';
import styles from './style/date.less';
import { checkType } from '@/utils/T';
import { EnumDateRange } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/constants';
import { obtainCurrentLanguageState } from '@/utils/T/core/helper';
import { queryRangePieces } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/api/formSet.js';
import { getDateRangePieces, validateDateRange } from '@/pages/BusinessSetting/ProcessManagement/CreateNew/FormDesign/api'
import { eventManager } from '@/utils/T/core/helper';
import { formily } from '@chaoswise/ui/formily';

const { useFormEffects, LifeCycleTypes } = formily;


// 生成一个数字范围数组，用于生成时间范围
const _range = (start, end) => {
  if (
    [undefined, null, ''].includes(start) ||
    [undefined, null, ''].includes(end)
  )
    return [];
  const timeRange = [];
  for (let i = start; i <= end - 1; i++) {
    timeRange.push(i);
  }
  return timeRange;
};



// 日期范围选择器组件
const IDate = ({
  value: _value, // 当前值
  onChange: _onChange = () => { }, // 值变化回调
  dateFormat, // 日期格式
  disabled, // 是否禁用
  placeholder, // 占位符
  onBlur, // 失去焦点回调
  suffixIcon, // 后缀图标
  isTableItem, // 是否在表格中
  t, // 表单上下文
  dateRange, // 日期范围限制
  fieldCode, // 字段编码
  serviceTimeIds, // 服务时间ID
  timeSelectRangeType = "ONLY_RANGE", // 时间选择范围类型
  rangeType = 'CUSTOM', // 范围类型
  extendSetting, // 扩展设置
}) => {

  const wrapperRef = useRef(null)

  // 当值为0且为数字类型时，重置为null
  useEffect(() => {
    if (value === 0 && checkType.isNumber(value)) {
      _onChange(null);
      onBlur(null);
    }
  }, [value]);


  const [allowOpen, setAllowOpen] = useState(true)
  const [open, setOpen] = useState(false); // 控制日期选择器弹出框的显示状态
  const mostValuesRef = useRef({ min: undefined, max: undefined }); // 存储最小和最大值的引用
  const [serviceTimeRange, setServiceTimeRange] = useState([]); // 服务时间范围
  const useExtend = rangeType === 'EXTEND' && (extendSetting && Array.isArray(extendSetting) && extendSetting.length > 0) // 是否使用扩展
  let _timeSelectRangeType = timeSelectRangeType
  if (useExtend) _timeSelectRangeType = 'ONLY_RANGE_OUT'
  const modelRef = useRef('start') // 当前选择的日期部分（开始/结束）
  const [rangeValue, setRangeValue] = useState(value) // 当前选择的日期范围值
  const [implementationTime, setImplementationTime] = useState(null) // 限制可以选择的日期范围值
  const [limitTimes, setLimitTimes] = useState(null)
  // please check it with mr , maybe convert when sync code.
  const { actions: formActions } = t || {};


  // 获取服务时间范围
  useEffect(() => {
    if (isBusinessPanel) return
    if (rangeType === 'SERVICETIME') {
      if (
        _timeSelectRangeType &&
        _timeSelectRangeType !== 'ANY' &&
        serviceTimeIds &&
        serviceTimeIds?.length
      ) {
        queryRangePieces(serviceTimeIds).then(res => {
          if (res.code === 100000) {
            setServiceTimeRange(res.data || []);
          }
        });
      }
    }
  }, [_timeSelectRangeType, serviceTimeIds, rangeType]);

  useEffect(() => {
    if (fieldCode === 'Implementation_Time' && !disabled) {
      try {
        if (rangeValue?.[0]) {
          const ele2 = wrapperRef.current.querySelector('.ant-picker-range-separator')
          if (ele2) {
            ele2.onclick = (e) => {
              e.stopPropagation();
            }
          }
          const ele = wrapperRef.current.querySelector('.ant-picker-input input')
          if (ele) {
            ele.readonly = true
            ele.disabled = true
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
  }, [rangeValue, disabled])

  useEffect(() => {
    setTimeout(async () => {
      const formState = await formActions?.getFormState()
      const fieldState = formState?.initialValues?.['ChangeSchedule_StartEndTime']
      if (fieldState?.startDate) {
        if (fieldCode == 'Implementation_Time') {
          let startDate = addOneMinute(fieldState?.startDate)
          setImplementationTime({ startDate: startDate, endDate: fieldState?.endDate })
        }
        if (fieldCode == 'Reversion_Time') {
          setLimitTimes({ startDate: fieldState?.startDate, endDate: fieldState?.endDate })
        }
      }
    }, 0);
  }, [])

  // 监听Implementation_Time & Reversion_Time 字段的变化,获取ChangeSchedule_StartEndTime时间限制范围
  useFormEffects(($, _) => {
    $(LifeCycleTypes.ON_FIELD_VALUE_CHANGE, 'ChangeSchedule_StartEndTime').subscribe((fieldState) => {
      if (fieldState?.value?.startDate) {
        if (fieldCode == 'Implementation_Time') {
          let startDate = addOneMinute(fieldState?.value?.startDate)
          setImplementationTime({ startDate: startDate, endDate: fieldState?.value?.endDate })
        }
        if (fieldCode == 'Reversion_Time') {
          setLimitTimes({ startDate: fieldState?.value?.startDate, endDate: fieldState?.value?.endDate })
        }
      } else {
        if (fieldCode == 'Implementation_Time') {
          setImplementationTime(null)
        }
        if (fieldCode == 'Reversion_Time') {
          setLimitTimes(null)
        }
      }
    })
  });

  const addOneMinute = (testdate) => {
    const oneMinuteInMilliseconds = 60 * 1000;
    return testdate + oneMinuteInMilliseconds;;
  }

  // 处理日期值转换
  const handelVal = (val) => {
    const _dateString = val
      ? [
        EnumDateFormatType.yearMonthDayHoursMinutes,
        EnumDateFormatType.all
      ].includes(dateFormat) &&
        dateFormat === EnumDateFormatType.yearMonthDayHoursMinutes
        ? val?.format('YYYY-MM-DD HH:mm')
        : val?.format('YYYY-MM-DD HH:mm:ss')
      : val;
    const _val = moment(_dateString).valueOf();
    const timeStamp = val
      ? dateFormat === EnumDateFormatType.yearMonthDay
        ? val.startOf('day').valueOf()
        : _val
      : null;
    return timeStamp
  }

  // 判断 [startDate, endDate] 是否在 [start, end] 范围内
  const isDateRangeWithinBounds = (oldVal, newVal) => {
    return oldVal.startDate >= newVal.startDate && oldVal.endDate <= newVal.endDate;
  }

  // 
  const resetFieldValue = async (fieldKey, val, type) => {
    const { startDate, endDate } = val || {};
    // ChangeSchedule_StartEndTime的开始时间即为Implementation_Time的开始时间
    if (fieldKey === 'Implementation_Time') {
      const implementTime = await formActions.getFieldValue('Implementation_Time')
      if (implementTime?.endDate) {
        let eDate = implementTime.endDate
        if (eDate > endDate || eDate < startDate) {
          eDate = null
        }
        t?.actions?.setFieldValue('Implementation_Time', { startDate, endDate: eDate });
      } else {
        t?.actions?.setFieldValue('Implementation_Time', { startDate, endDate: null });
      }
    } else if (fieldKey === 'Reversion_Time') {
      const chagneScheduleValueRange = await formActions.getFieldValue('ChangeSchedule_StartEndTime')
      const implementValueRange = await formActions.getFieldValue('Implementation_Time')
      const reversionValue = await formActions.getFieldValue('Reversion_Time')
      if (type == 'ChangeSchedule_StartEndTime') {
        if ((startDate > reversionValue?.startDate || startDate > implementValueRange?.startDate) || (endDate < reversionValue?.endDate || endDate < implementValueRange?.endDate)) {
          t?.actions?.setFieldValue('Implementation_Time', { startDate, endDate: null });
          t?.actions?.setFieldValue('Reversion_Time', null);
        }
      } else if (type == 'Implementation_Time') {
        if (!reversionValue && endDate) {
          const reversion = {
            startDate: endDate,
            endDate: chagneScheduleValueRange?.endDate
          }
          t?.actions?.setFieldValue('Reversion_Time', reversion);
        }
      }
    }
    // 只设置值字段不会重新渲染的，所以我们给字段随便设置一个属性让它再次渲染
    formActions.setFieldState(fieldKey, state => {
      state.__radKey = Math.random().toString(32).substring(2, 16)
    })
  }

  // 在这里处理字段联动
  const dealWithChangeTime = async (val) => {
    // 修改ChangeScheduleStartEndTime的同时要联动修改Implementation_Time和Reversion_time的值
    if (fieldCode === 'ChangeSchedule_StartEndTime') {
      if (!val?.startDate && !val?.endDate) {
        // 清空这俩字段的值
        t?.actions?.setFieldValue('Reversion_Time', null)
        t?.actions?.setFieldValue('Implementation_Time', null)
      } else {
        // 然后就要看Implementation_Time和Reversion_Time选择的时间是否在ChangeSchedule_StartEndTime的时间范围内
        await resetFieldValue('Implementation_Time', val, 'ChangeSchedule_StartEndTime')
        await resetFieldValue('Reversion_Time', val, 'ChangeSchedule_StartEndTime')
      }
    } else if (fieldCode === 'Implementation_Time') {
      // 当修改了Implementation_Time的值，我们要给Reversion_time字段自动赋值
      await resetFieldValue('Reversion_Time', val, 'Implementation_Time')
    }
  }

  const checkDateTimeIsValid = (current, partical) => {
    if (!moment.isMoment(current)) return false
    if (!current) return false
    const disabledTimes = disabledTime(current, partical)
    if (disabledTimes) {
      const disabledHours = disabledTimes.disabledHours()
      if (disabledHours?.includes(current.hour())) return false
      const disabledMinutes = disabledTimes.disabledMinutes(current.hour())
      if (disabledMinutes?.includes(current.minute())) return false
    }
    return true
  }

  // 处理日期范围变化
  const handleChange = async val => {
    if (fieldCode == 'Implementation_Time') {
      if (!val) {
        setAllowOpen(false)
        setTimeout(() => {
          setAllowOpen(true)
        }, 0);
      }
      const changeScheduleValue = await t.actions.getFieldValue('ChangeSchedule_StartEndTime')
      val = [changeScheduleValue?.startDate ? moment(changeScheduleValue.startDate) : null, val?.[1]]
    }
    // Reversion_Time 结束时间&开始时间可以相同
    if (fieldCode !== 'Reversion_Time') {
      if (val?.[0]?.isSame(val?.[1])) {
        val[1] = null
      }
    }
    // 检查是否可选
    if (val?.[0] && !checkDateTimeIsValid(val[0], 'start')) {
      val[0] = null
    }
    if (val?.[1] && !checkDateTimeIsValid(val[1], 'end')) {
      val[1] = null
    }
    if (!val) {
      setRangeValue(null);
      if (fieldCode == 'ChangeSchedule_StartEndTime') {
        // 清空这俩字段的值
        t?.actions?.setFieldValue('Reversion_Time', null)
        t?.actions?.setFieldValue('Implementation_Time', null)
      }
      _onChange(null);
      onBlur && onBlur(null);
      return;
    }
    const [start, end] = val;
    let value = { startDate: handelVal(start), endDate: handelVal(end) }
    let _val = [start, end]
    if (value.startDate && value.endDate) {
      // 不要这样写啊，这样很奇怪
      // 模板创建的工单，这个时间可能已经小于当前时间了，用户重新选择时间的时候会发现开始时间跑到结束时间了都提bug了啊
      // if (value.startDate > value.endDate) {
      //   value = { startDate: handelVal(end), endDate: handelVal(start) }
      //   _val = [end, start]
      // }
      // 我们直接改成结束时间大于开始时间则清空结束时间
      if (value.startDate > value.endDate) {
        value.endDate = null
        _val[1] = null
      }
    }
    setRangeValue(_val);
    await dealWithChangeTime(value)
    _onChange(value);
    onBlur && onBlur(value);
    // 如果使用扩展，验证日期范围
    if (useExtend) {
      if (val) {
        t?.actions?.getFormState(state => {
          const formData = { ...(state.values || {}), ...(t.baseActions.getBaseValue() || {}) }
          validateDateRange({
            formId: t.orderInfo.formId,
            formData,
            fieldCode,
            extendClassId: extendSetting[0].id,
          }).then(res => {
            if (!res.data) return
            if (res.data.correct === true) {
              // 验证成功，显示成功提示
              t.actions.setFieldState(fieldCode, state => {
                state.errors = []
                const successHint = {
                  hintType: 'custom',
                  hintContent: `<span style="color: #72c240;"}>${res.data.message}</span>`
                }
                if (state.props['x-props'].fieldHint && Array.isArray(state.props['x-props'].fieldHint)) {
                  const hint4Index = state.props['x-props'].fieldHint.findIndex(i => i.hintType === 'custom')
                  if (hint4Index > -1) {
                    state.props['x-props'].fieldHint[hint4Index] = successHint
                  } else {
                    state.props['x-props'].fieldHint.push(successHint)
                  }
                }
              })
            } else {
              // 验证失败，显示错误信息
              t.actions.setFieldState(fieldCode, state => {
                state.errors = [res.data.message]
                if (state.props['x-props'].fieldHint && Array.isArray(state.props['x-props'].fieldHint)) {
                  const hint4Index = state.props['x-props'].fieldHint.findIndex(i => i.hintType === 'custom')
                  if (hint4Index > -1) {
                    state.props['x-props'].fieldHint.splice(hint4Index, 1)
                  }
                }
              })
            }
          })
        })
      } else {
        // 清除自定义提示
        t.actions.setFieldState(fieldCode, state => {
          if (state.props['x-props'].fieldHint && Array.isArray(state.props['x-props'].fieldHint)) {
            const hint4Index = state.props['x-props'].fieldHint.findIndex(i => i.hintType === 'custom')
            if (hint4Index > -1) {
              state.props['x-props'].fieldHint.splice(hint4Index, 1)
            }
          }
        })
      }
    }
  };

  const { isBusinessPanel, getPopupContainer, formLayout } = t || {};
  const _suffixIcon = suffixIcon || <Icon type="calendar" />;
  // 设置日期格式
  let _dateFormat =
    EnumDateFormatType.yearMonthDay === dateFormat
      ? EnumDateFormatRule.yearMonthDay
      : EnumDateFormatType.yearMonthDayHoursMinutes === dateFormat
        ? EnumDateFormatRule.yearMonthDayHoursMinutes
        : EnumDateFormatRule.all;

  // 禁用日期处理函数
  const _disabledDate = useCallback(
    current => {
      try {
        if (_timeSelectRangeType === 'ANY') return false;
        // 添加7天限制逻辑
        if (fieldCode === 'ChangeSchedule_StartEndTime') {
          if (rangeValue?.[0] && modelRef.current === 'end') {
            // 如果已选择开始时间，限制结束时间不能超过开始时间7天
            const startDate = moment(rangeValue[0]);
            const maxEndDate = moment(startDate).add(7, 'days');
            if (serviceTimeRange && serviceTimeRange?.length) {
              const isInServiceTime = serviceTimeRange.some(i => {
                const pieceBegin = moment(i.begin);
                const pieceEnd = moment(i.end);
                if (current.format('YYYY-MM-DD') !== pieceBegin.format('YYYY-MM-DD') &&
                  current.format('YYYY-MM-DD') !== pieceEnd.format('YYYY-MM-DD') &&
                  current.isBetween(pieceBegin, pieceEnd, 'day', '[]')) {
                  return true;
                }
              })
              if (isInServiceTime) {
                return true;
              }
            }
            // 如果是同一天，让时间选择器来处理
            if (current.format('YYYY-MM-DD') === maxEndDate.format('YYYY-MM-DD')) {
              return false;
            }
            if (current.isAfter(maxEndDate)) {
              return true;
            }
          }
          if (rangeValue?.[1] && modelRef.current === 'start') {
            // 如果已选择结束时间，限制开始时间不能早于结束时间7天前
            const today = moment().startOf('day');
            const endDate = moment(rangeValue[1]);
            const calculatedMinStartDate = moment(endDate).subtract(7, 'days');
            const minStartDate = calculatedMinStartDate.isBefore(today) ? today : calculatedMinStartDate;
            if (current.isBefore(minStartDate)) {
              return true;
            }
          }
        }
        if (rangeType === 'CUSTOM') {
          if (dateRange) {
            const { dateMaxLimit, dateMinLimit } = dateRange;
            const _dateRange = [];
            // 处理最小日期限制
            if (dateMinLimit) {
              const { addon, key, days, id } = dateMinLimit;
              if (addon === 'before') {
                if (key === 'today_before') {
                  const _startDate = moment().subtract(days, 'day');
                  _dateRange[0] = _startDate.startOf('day');
                }
              } else if (!addon && key === 'today') {
                const _startDate = moment();
                _dateRange[0] = _startDate.startOf('day');
              } else if (addon === 'after') {
                if (key === 'today_after') {
                  const _startDate = moment().add(days, 'day');
                  _dateRange[0] = _startDate.startOf('day');
                }
              } else if (addon === EnumDateRange.thisWeek) {
                if (key === EnumDateRange.thisWeek) {
                  if (obtainCurrentLanguageState() === 'en') {
                    _dateRange[0] = moment()
                      .startOf('week')
                      .add(1, 'day');
                  } else {
                    _dateRange[
                      _timeSelectRangeType === 'ONLY_RANGE' ? 0 : 1
                    ] = moment().startOf('week');
                  }
                }
              } else if (addon === EnumDateRange.thisMonth) {
                if (key === EnumDateRange.thisMonth) {
                  _dateRange[0] = moment().startOf('month');
                }
              } else if (addon === EnumDateRange.thisYear) {
                if (key === EnumDateRange.thisYear) {
                  _dateRange[0] = moment().startOf('year');
                }
              } else {
                if (!addon) {
                  // 自定义时间
                  if (key === 'defined' && dateMinLimit?.defined) {
                    _dateRange[0] = moment(mostValuesRef.current.min).startOf('day');
                  } else {
                    let _startDate = mostValuesRef.current.min;
                    if (_startDate) {
                      _dateRange[0] = moment(_startDate).startOf('day');
                    }
                  }
                }
              }
            }
            // 处理最大日期限制
            if (dateMaxLimit) {
              const { addon, key, days, id } = dateMaxLimit;
              if (addon === 'before') {
                if (key === 'today_before') {
                  const _endDate = moment().subtract(days, 'day');
                  _dateRange[1] = _endDate.endOf('day');
                }
              } else if (!addon && key === 'today') {
                const _endDate = moment();
                _dateRange[1] = _endDate.endOf('day');
              } else if (addon === 'after') {
                if (key === 'today_after') {
                  const _endDate = moment().add(days, 'day');
                  _dateRange[1] = _endDate.endOf('day');
                }
              } else if (addon === EnumDateRange.thisWeek) {
                if (key === EnumDateRange.thisWeek) {
                  if (obtainCurrentLanguageState() === 'en') {
                    _dateRange[1] = moment()
                      .endOf('week')
                      .add(1, 'day');
                  } else {
                    _dateRange[1] = moment().endOf('week');
                  }
                }
              } else if (addon === EnumDateRange.thisMonth) {
                if (key === EnumDateRange.thisMonth) {
                  _dateRange[1] = moment().endOf('month');
                }
              } else if (addon === EnumDateRange.thisYear) {
                if (key === EnumDateRange.thisYear) {
                  _dateRange[1] = moment().endOf('year');
                }
              } else {
                if (!addon) {
                  // 自定义时间
                  if (key === EnumDateRange.defined && dateMaxLimit?.defined) {
                    _dateRange[1] = moment(mostValuesRef.current.max).endOf('day');
                  } else {
                    let _endDate = mostValuesRef.current.max;
                    if (_endDate) {
                      _dateRange[1] = moment(_endDate).endOf('day');
                    }
                  }
                }
              }
            }
            // 根据日期范围判断是否禁用
            if (_dateRange[0] && !_dateRange[1]) {
              return current < _dateRange[0];
            } else if (_dateRange[1] && !_dateRange[0]) {
              return current > _dateRange[1];
            } else if (_dateRange[0] && _dateRange[1]) {
              return !(current >= _dateRange[0] && current <= _dateRange[1])
            } else {
              return false;
            }
          } else {
            return false;
          }
        } else {
          if (serviceTimeRange && serviceTimeRange?.length) {
            const _dateRanges = serviceTimeRange.map(i => ({
              begin: moment(i.begin),
              end: moment(i.end)
            }));
            if (_timeSelectRangeType === 'ONLY_RANGE') {
              return !_dateRanges.some(
                i =>
                  i.begin.startOf('day') <= current &&
                  i.end.endOf('day') >= current
              );
            } else {
              let result = calcServiceTime(serviceTimeRange, current);
              if (result) {
                return result.disabledHours().length === 24;
              }
              return false;
            }
          } else {
            return false;
          }
        }
      } catch (error) {
        console.error(error)
      }
    },
    [rangeType, serviceTimeRange, _timeSelectRangeType, rangeValue, modelRef.current]
  );
  const disabledDateSchedule = useCallback(
    current => {
      try {
        if (_timeSelectRangeType === 'ANY') return false;
        // 添加7天限制逻辑
        if (fieldCode === 'scheduleTime') {
          const serverTime = moment();
          if (rangeValue?.[0] && modelRef.current === 'start') {
            const startDate = moment(rangeValue[0]);
            if (current.isBefore(startDate, 'day')) {
              return true;
            }
          } else if (!rangeValue?.[0]) {
            if (current.isBefore(serverTime, 'day')) {
              return true;
            }
          }
          if (rangeValue?.[0] && modelRef.current === 'end') {
            // 如果已选择开始时间，限制结束时间不能超过开始时间7天
            const startDate = moment(rangeValue[0]);
            const maxEndDate = moment(rangeValue[0]).add(7, 'days');
            // 如果是同一天，让时间选择器来处理
            if (current.format('YYYY-MM-DD') === maxEndDate.format('YYYY-MM-DD') || current.format('YYYY-MM-DD') === startDate.format('YYYY-MM-DD')) {
              return false;
            }
            if (current.isAfter(maxEndDate) || current.isBefore(startDate)) {
              return true;
            }
          }
          if (rangeValue?.[1] && modelRef.current === 'start') {
            // 如果已选择结束时间，限制开始时间不能早于结束时间7天前
            const today = moment().startOf('day');
            const endDate = moment(rangeValue[1]);
            const calculatedMinStartDate = moment(endDate).subtract(7, 'days');
            const minStartDate = calculatedMinStartDate.isBefore(today) ? today : calculatedMinStartDate;
            if (current.isBefore(minStartDate)) {
              return true;
            }
          }
        }
      } catch (error) {
        console.error(error)
      }
    },
    [rangeType, rangeValue, modelRef.current]
  );

  // 检查两个日期时间是否相同
  const isValidSameDateTime = (current, target, type = 'date') => {
    const _format = type === 'date' ? 'YYYY-MM-DD' : 'HH:mm:ss';
    const currentDate = current.format(_format);
    const targetDate = target.format(_format);
    if (['hours', 'minutes', 'seconds'].includes(type)) {
      const _currentTimeArr = currentDate.split(':');
      const _targetimeArr = targetDate.split(':');
      switch (type) {
        case 'hours':
          return _currentTimeArr[0] === _targetimeArr[0];
        case 'minutes':
          return _currentTimeArr[1] === _targetimeArr[1];
        case 'seconds':
          return _currentTimeArr[2] === _targetimeArr[2];
      }
    } else {
      return currentDate === targetDate;
    }
  };

  // 计算服务时间
  const calcServiceTime = (serviceTimeRangeTemp, date) => {
    try {
      const totalHours = _range(0, 24);
      const totalMinutes = _range(0, 60);
      const totalSeconds = _range(0, 60);
      const tempDate = moment(date);
      const _dateRanges = serviceTimeRangeTemp.map(i => ({
        begin: moment(i.begin),
        end: moment(i.end)
      }));
      // 过滤出同一天的时间范围
      const sameDateRanges = _dateRanges
        .filter(i => {
          const isValid =
            moment(i.begin).startOf('day') <= moment(tempDate).startOf('day') &&
            moment(i.end).endOf('day') >= moment(tempDate).endOf('day');
          return isValid;
        })
        .map(i => {
          let beginTmp = moment(i.begin);
          let endTmp = moment(i.end);
          if (moment(i.end).endOf('day') > moment(tempDate).endOf('day')) {
            endTmp = moment(tempDate).endOf('day');
          }
          if (moment(i.begin).startOf('day') < moment(tempDate).startOf('day')) {
            beginTmp = moment(tempDate).startOf('day');
          }
          return {
            begin: beginTmp,
            end: endTmp
          };
        });
      if (sameDateRanges && sameDateRanges.length !== 0) {
        let hours = [];
        // 计算可用的小时范围
        if (_timeSelectRangeType === 'ONLY_RANGE_OUT') {
          for (let index = 0; index < sameDateRanges.length; index++) {
            const sameDateRangeItem = sameDateRanges[index];
            if (index === 0 && sameDateRangeItem.begin.hours() !== 0) {
              hours = hours.concat(
                _range(
                  moment(sameDateRangeItem.begin)
                    .startOf('day')
                    .hours(),
                  moment(sameDateRangeItem.begin)
                    .subtract(1, 'seconds')
                    .hours() + 1
                )
              );
            }
            if (index != sameDateRanges.length - 1) {
              hours = hours.concat(
                _range(
                  moment(sameDateRangeItem.end).add(1, 'seconds').hours(),
                  moment(sameDateRanges[index + 1].begin)
                    .subtract(1, 'seconds')
                    .hours() + 1
                )
              );
            } else if (
              sameDateRangeItem.end.format('HH:mm:ss') != '23:59:59'
            ) {
              hours = hours.concat(
                _range(
                  moment(sameDateRangeItem.end).hours(),
                  moment(sameDateRangeItem.end)
                    .endOf('day')
                    .hours() + 1
                )
              );
            }
            if (sameDateRangeItem.begin.hours() == 0 && sameDateRangeItem.begin.minutes() != 0) {
              hours.push(0)
            }
          }
        } else {
          for (let index = 0; index < sameDateRanges.length; index++) {
            const sameDateRangeItem = sameDateRanges[index];
            hours = hours.concat(
              _range(
                moment(sameDateRangeItem.begin)
                  .hours(),
                moment(sameDateRangeItem.end)
                  .hours() + 1
              )
            );
          }
        }
        return {
          // 返回禁用的小时
          disabledHours: () => {
            return totalHours.filter(i => !hours.includes(i));
          },
          // 返回禁用的分钟
          disabledMinutes: selectedHour => {
            if (selectedHour === -1) {
              return [];
            }
            let sameHourRanges = sameDateRanges
              .filter(i => {
                return (
                  moment(i.begin).startOf('hour') <=
                  moment(tempDate).hours(selectedHour).startOf('hour') &&
                  moment(i.end).endOf('hour') >= moment(tempDate).hours(selectedHour).endOf('hour')
                );
              })
              .map(i => {
                let beginTmp = moment(i.begin);
                let endTmp = moment(i.end);
                if (moment(i.end).endOf('hour') > moment(tempDate).hours(selectedHour).endOf('hour')) {
                  endTmp = moment(tempDate).hours(selectedHour).endOf('hour');
                }



                if (moment(i.begin).startOf('hour') < moment(tempDate).hours(selectedHour).startOf('hour')) {
                  beginTmp = moment(tempDate).hours(selectedHour).startOf('hour');
                }
                return {
                  begin: beginTmp,
                  end: endTmp
                };
              });
            if (sameHourRanges && sameHourRanges.length !== 0) {
              if (
                sameHourRanges[0].begin.hours() !== selectedHour
              ) {
                sameHourRanges[0].begin = moment(tempDate).hours(selectedHour).startOf('hour');
              }
              if (
                sameHourRanges[sameHourRanges.length - 1].end.hours() !== selectedHour
              ) {
                sameHourRanges[sameHourRanges.length - 1].end = moment(
                  tempDate
                ).hours(selectedHour).endOf('hour');
              }



              let minutes = [];
              if (_timeSelectRangeType === 'ONLY_RANGE_OUT') {
                for (let index = 0; index < sameHourRanges.length; index++) {
                  const sameHourRangeItem = sameHourRanges[index];
                  if (index === 0 && sameHourRangeItem.begin.minutes() !== 0) {
                    minutes = minutes.concat(
                      _range(
                        moment(sameHourRangeItem.begin)
                          .startOf('hour')
                          .minutes(),
                        moment(sameHourRangeItem.begin)
                          .subtract(1, 'seconds')
                          .minutes() + 1
                      )
                    );
                  }
                  if (index != sameHourRanges.length - 1) {
                    minutes = minutes.concat(
                      _range(
                        moment(sameHourRangeItem.end).add(1, 'seconds').minutes(),
                        moment(sameHourRanges[index + 1].begin)
                          .subtract(1, 'seconds')
                          .minutes() + 1
                      )
                    );
                  } else if (
                    sameHourRangeItem.end.seconds() !== 59
                  ) {
                    minutes = minutes.concat(
                      _range(
                        moment(sameHourRangeItem.end).minutes(),
                        moment(sameHourRangeItem.end)
                          .endOf('hour')
                          .minutes() + 1
                      )
                    );
                  }
                }
              } else {
                for (let index = 0; index < sameHourRanges.length; index++) {
                  const sameHourRangeItem = sameHourRanges[index];
                  minutes = minutes.concat(
                    _range(
                      moment(sameHourRangeItem.begin)
                        .minutes(),
                      moment(sameHourRangeItem.end)
                        .minutes() + 1
                    )
                  );
                }
              }
              return totalMinutes.filter(i => !minutes.includes(i));
            }
            return [];
          },
          // 返回禁用的秒数
          disabledSeconds: (selectedHour, selectedMinute) => {
            if (selectedHour == -1 || selectedMinute == -1) {
              return [];
            }
            let sameHourRanges = sameDateRanges
              .filter(i => {
                return (
                  moment(i.begin).startOf('hour') <=
                  moment(tempDate).hours(selectedHour).startOf('hour') &&
                  moment(i.end).endOf('hour') >= moment(tempDate).hours(selectedHour).endOf('hour')
                );
              })
              .map(i => {
                let beginTmp = moment(i.begin);
                let endTmp = moment(i.end);
                if (moment(i.end).endOf('hour') > moment(tempDate).hours(selectedHour).endOf('hour')) {
                  endTmp = moment(tempDate).hours(selectedHour).endOf('hour');
                }



                if (moment(i.begin).startOf('hour') < moment(tempDate).hours(selectedHour).startOf('hour')) {
                  beginTmp = moment(tempDate).hours(selectedHour).startOf('hour');
                }



                return {
                  begin: beginTmp,
                  end: endTmp
                };
              });
            let sameMinuteRanges = sameHourRanges
              .filter(i => {
                return (
                  moment(i.begin).startOf('minute') <=
                  moment(tempDate).startOf('minute') &&
                  moment(i.end).endOf('minute') >=
                  moment(tempDate).endOf('minute')
                );
              })
              .map(i => {
                return {
                  begin: moment(i.begin),
                  end: moment(i.end)
                };
              });
            if (sameMinuteRanges && sameMinuteRanges.length !== 0) {
              if (
                !isValidSameDateTime(
                  tempDate,
                  sameMinuteRanges[0].begin,
                  'minutes'
                )
              ) {
                sameMinuteRanges[0].begin = moment(tempDate).startOf('minute');
              }
              if (
                !isValidSameDateTime(
                  tempDate,
                  sameMinuteRanges[sameMinuteRanges.length - 1].end,
                  'minutes'
                )
              ) {
                sameMinuteRanges[sameMinuteRanges.length - 1].end = moment(
                  tempDate
                ).endOf('minute');
              }
              let seconds = [];
              sameMinuteRanges.map(i => {
                let min = moment(i.begin).seconds();
                let max = moment(i.end).seconds();
                seconds = seconds.concat(_range(min, max + 1));
              });
              if (_timeSelectRangeType === 'ONLY_RANGE') {
                return totalSeconds.filter(i => !seconds.includes(i));
              } else {
                return totalSeconds.filter(i => seconds.includes(i));
              }
            }
            return [];
          }
        };
      }
    } catch (error) {
      console.error(error)
    }
  };

  // 处理时间禁用
  const _disabledTime = useCallback(
    (date, partical) => {
      try {
        if (partical) modelRef.current = partical;
        if (_timeSelectRangeType === 'ANY') {
          return false;
        }
        if (!date) {
          return {
            disabledHours: () => Array.from({ length: 24 }, (_, index) => index),
            disabledMinutes: () => Array.from({ length: 60 }, (_, index) => index),
            disabledSeconds: () => Array.from({ length: 60 }, (_, index) => index),
          };
        }
        // 添加7天时间限制逻辑
        if (fieldCode === 'ChangeSchedule_StartEndTime') {
          if (rangeValue?.[0] && modelRef.current === 'end') {
            const startDate = moment(rangeValue[0]);
            const maxEndDate = moment(startDate).add(7, 'days');
            
            // 如果是第7天，需要禁用超过开始时间的小时和分钟
            if (date.format('YYYY-MM-DD') === maxEndDate.format('YYYY-MM-DD')) {
              const startHour = startDate.hours();
              const startMinute = startDate.minutes();
              return {
                disabledHours: () => {
                  return Array.from({ length: 24 }, (_, i) => i).filter(h => h > startHour);
                },
                disabledMinutes: (selectedHour) => {
                  if (selectedHour === startHour) {
                    return Array.from({ length: 60 }, (_, i) => i).filter(m => m > startMinute);
                  }
                  return [];
                },
                disabledSeconds: (selectedHour, selectedMinute) => {
                  return [];
                }
              };
            } else if (date.format('YYYY-MM-DD') === startDate.format('YYYY-MM-DD')) {
              const startHour = startDate.hours();
              const startMinute = startDate.minutes();
              return {
                disabledHours: () => {
                  return Array.from({ length: 24 }, (_, i) => i).filter(h => h < startHour);
                },
                disabledMinutes: (selectedHour) => {
                  if (selectedHour === startHour) {
                    return Array.from({ length: 60 }, (_, i) => i).filter(m => m <= startMinute);
                  }
                  return [];
                },
                disabledSeconds: (selectedHour, selectedMinute) => {
                  return [];
                }
              };
            }
          }
          if (rangeValue?.[1] && modelRef.current === 'start') {
            const endDate = moment(rangeValue[1]);
            const minStartDate = moment(endDate).subtract(7, 'days');
            // 如果是第7天，需要禁用早于结束时间的小时和分钟
            if (date.format('YYYY-MM-DD') === minStartDate.format('YYYY-MM-DD')) {
              const endHour = endDate.hours();
              const endMinute = endDate.minutes();
              // 不只是早于结束时间的时分，本身就在禁用时间分片中的时分那也不能再次放开啊
              // 先找到这个日期是否在时间分片中
              const isInServiceTime = serviceTimeRange?.find(i => {
                const pieceBegin = moment(i.begin);
                const pieceEnd = moment(i.end);
                // 只看begin和end的就行 中间不用看，中间的在日期禁用中已全天禁用，不会走到这儿
                return date.format('YYYY-MM-DD') === pieceBegin.format('YYYY-MM-DD') || date.format('YYYY-MM-DD') === pieceEnd.format('YYYY-MM-DD')
              })
              const disabledHours = [];
              const disabledMinutes = [];
              if (isInServiceTime) {
                const beginPiece = moment(isInServiceTime.begin);
                const endPiece = moment(isInServiceTime.end);
                if (date.format('YYYY-MM-DD') === beginPiece.format('YYYY-MM-DD')) {
                  const beginHour = beginPiece.hours();
                  const beginMinute = beginPiece.minutes();
                  for (let i = beginHour + 1; i < 24; i++) {
                    disabledHours.push(i);
                  }
                  for (let i = beginMinute + 1; i < 60; i++) {
                    disabledMinutes.push(i);
                  }
                }
                if (date.format('YYYY-MM-DD') === endPiece.format('YYYY-MM-DD')) {
                  const pendHour = endPiece.hours();
                  const pendMinute = endPiece.minutes();
                  for (let i = 0; i < pendHour; i++) {
                    disabledHours.push(i);
                  }
                  for (let i = 0; i < pendMinute; i++) {
                    disabledMinutes.push(i);
                  }
                  return {
                    disabledHours: () => {
                      return Array.from({ length: 24 }, (_, i) => i).filter(h => h < endHour || disabledHours.includes(h));
                    },
                    disabledMinutes: (selectedHour) => {
                      if (selectedHour === pendHour) {
                        return Array.from({ length: 60 }, (_, i) => i).filter(m => m < pendMinute || disabledMinutes.includes(m));
                      }
                      if (selectedHour === endHour) {
                        return Array.from({ length: 60 }, (_, i) => i).filter(m => m < endMinute);
                      }
                      return [];
                    },
                    disabledSeconds: (selectedHour, selectedMinute) => {
                      return [];
                    }
                  }
                }
                return {
                  disabledHours: () => {
                    return Array.from({ length: 24 }, (_, i) => i).filter(h => h < endHour);
                  },
                  disabledMinutes: (selectedHour) => {
                    if (selectedHour === endHour) {
                      return Array.from({ length: 60 }, (_, i) => i).filter(m => m < endMinute);
                    }
                    return []
                  },
                  disabledSeconds: (selectedHour, selectedMinute) => {
                    return [];
                  }
                };
              }
            }
          }

        }
        if (serviceTimeRange && date && rangeType === 'SERVICETIME') {
          const result = calcServiceTime(serviceTimeRange || [], date);
          return result;
        }
        if (useExtend) {
          const result = calcServiceTime(serviceTimeRange || [], date);
          return result;
        }
        if (dateRange && rangeType === 'CUSTOM') {
          const { dateMaxLimit, dateMinLimit } = dateRange;
          const _dateRange = [moment().years(-27000), moment().years(27000)];
          // 处理最小日期限制
          if (dateMinLimit) {
            const { addon, key, days, id } = dateMinLimit;
            if (addon === 'before') {
              if (key === 'today_before') {
                const _startDate = moment().subtract(days, 'day');
                _dateRange[0] = _startDate.startOf('day');
              }
            } else if (!addon && key === 'today') {
              const _startDate = moment();
              _dateRange[0] = _startDate.startOf('day');
            } else if (addon === 'after') {
              if (key === 'today_after') {
                const _startDate = moment().add(days, 'day');
                _dateRange[0] = _startDate.startOf('day');
              }
            } else if (addon === EnumDateRange.thisWeek) {
              if (key === EnumDateRange.thisWeek) {
                if (obtainCurrentLanguageState() === 'en') {
                  _dateRange[0] = moment()
                    .startOf('week')
                    .add(1, 'day');
                } else {
                  _dateRange[0] = moment().startOf('week');
                }
              }
            } else if (addon === EnumDateRange.thisMonth) {
              if (key === EnumDateRange.thisMonth) {
                _dateRange[0] = moment().startOf('month');
              }
            } else if (addon === EnumDateRange.thisYear) {
              if (key === EnumDateRange.thisYear) {
                _dateRange[0] = moment().startOf('year');
              }
            } else {
              if (!addon) {
                if (key === 'defined' && dateMinLimit?.defined) {
                  _dateRange[0] = moment(mostValuesRef.current.min);
                } else {
                  let _startDate = mostValuesRef.current.min;
                  if (_startDate) {
                    _dateRange[0] = moment(_startDate);
                  }
                }
              }
            }
          }
          // 处理最大日期限制
          if (dateMaxLimit) {
            const { addon, key, days, id } = dateMaxLimit;
            if (addon === 'before') {
              if (key === 'today_before') {
                const _endDate = moment().subtract(days, 'day');
                _dateRange[1] = _endDate.endOf('day');
              }
            } else if (!addon && key === 'today') {
              const _endDate = moment();
              _dateRange[1] = _endDate.endOf('day');
            } else if (addon === 'after') {
              if (key === 'today_after') {
                const _endDate = moment().add(days, 'day');
                _dateRange[1] = _endDate.endOf('day');
              }
            } else if (addon === EnumDateRange.thisWeek) {
              if (key === EnumDateRange.thisWeek) {
                if (obtainCurrentLanguageState() === 'en') {
                  _dateRange[1] = moment()
                    .endOf('week')
                    .add(1, 'day');
                } else {
                  _dateRange[1] = moment().endOf('week');
                }
              }
            } else if (addon === EnumDateRange.thisMonth) {
              if (key === EnumDateRange.thisMonth) {
                _dateRange[1] = moment().endOf('month');
              }
            } else if (addon === EnumDateRange.thisYear) {
              if (key === EnumDateRange.thisYear) {
                _dateRange[1] = moment().endOf('year');
              }
            } else {
              if (!addon) {
                // 自定义时间
                if (key === EnumDateRange.defined && dateMaxLimit?.defined) {
                  _dateRange[1] = moment(mostValuesRef.current.max);
                } else {
                  let _endDate = mostValuesRef.current.max;
                  if (_endDate) {
                    _dateRange[1] = moment(_endDate);
                  }
                }
              }
            }
          }
          const _dateLongRange = [
            {
              begin: _dateRange[0].valueOf(),
              end: _dateRange[1].valueOf()
            }
          ];
          const result = calcServiceTime(_dateLongRange || [], date);
          return result;
        }
        return {
          disabledHours: () => [],
          disabledMinutes: selectedHour => {
            return [];
          },
          disabledSeconds: (selectedHour, selectedMinute) => {
            return [];
          }
        };
      } catch (error) {
        console.error(error)
      }
    }, [rangeType, serviceTimeRange, _timeSelectRangeType, rangeValue, modelRef.current]);

      // 处理时间禁用
  const _disabledTimeSchedule = useCallback(
    (date, partical) => {
      try {
        if (partical) modelRef.current = partical;
        if (_timeSelectRangeType === 'ANY') {
          return false;
        }
        if (!date) {
          return {
            disabledHours: () => Array.from({ length: 24 }, (_, index) => index),
            disabledMinutes: () => Array.from({ length: 60 }, (_, index) => index),
            disabledSeconds: () => Array.from({ length: 60 }, (_, index) => index),
          };
        }
        // 添加7天时间限制逻辑
        if (fieldCode === 'scheduleTime') {
            if (rangeValue?.[0] && modelRef.current === 'start') {
              const serverTime = moment()
              const startDate = moment(rangeValue[0]);
              const endDate = rangeValue?.[1] ? moment(rangeValue[1]) : null;
              return {
                disabledHours: () => {
                  if (startDate.isSame(serverTime, 'day')) {
                    // 当 startDate 等于 serverTime 的日期时，限制小于 serverTime 的小时
                    return getDateRange(0, serverTime.hour());
                  } else if (startDate.isAfter(serverTime, 'day')) {
                    // 当 startDate 大于 serverTime 的日期时，不限制小时
                    return [];
                  }
                  if (date.isSame(startDate, 'day') && date.isSame(endDate, 'day')) {
                    // 开始和结束日期是同一天
                    return [...getDateRange(0, startDate.hour()), ...getDateRange(endDate.hour() + 1, 24)];
                  } else if (date.isSame(startDate, 'day')) {
                    // 只是开始日期
                    return getDateRange(0, startDate.hour());
                  } else if (date.isSame(endDate, 'day')) {
                    // 只是结束日期
                    return getDateRange(endDate.hour() + 1, 24);
                  }
                  return [];
                },
                disabledMinutes: (selectedHour) => {
                  if (startDate.isSame(serverTime, 'day') && selectedHour === serverTime.hour()) {
                    // 当 startDate 等于 serverTime 的日期，且选中的小时等于 serverTime 的小时时，限制小于 serverTime 的分钟
                    return getDateRange(0, serverTime.minute());
                  } else if (startDate.isSame(serverTime, 'day') && selectedHour > serverTime.hour()) {
                    return [];
                  }else if (startDate.isAfter(serverTime, 'day')) {
                    // 当 startDate 大于 serverTime 的日期时，不限制分钟
                    return [];
                  }
                  if (date.isSame(startDate, 'day') && date.isSame(endDate, 'day')) {
                    // 开始和结束日期是同一天
                    if (selectedHour === startDate.hour() && selectedHour === endDate.hour()) {
                      const maxMinute = endDate.minutes();
                      const minMinute = startDate.minutes();
                      return Array.from({ length: 60 }, (_, index) => index).filter(i => i < minMinute || i > maxMinute);
                    }
                    if (selectedHour === startDate.hour()) {
                      return getDateRange(0, startDate.minute());
                    } else if (selectedHour === endDate.hour()) {
                      return getDateRange(endDate.minute() + 1, 60);
                    }
                  } else if (date.isSame(startDate, 'day') && selectedHour === startDate.hour()) {
                    // 只是开始日期
                    return getDateRange(0, startDate.minute());
                  } else if (date.isSame(endDate, 'day') && selectedHour === endDate.hour()) {
                    // 只是结束日期
                    return getDateRange(endDate.minute() + 1, 60);
                  }
                  return [];
                },
                disabledSeconds: () => []
              };
            }
          if (rangeValue?.[0] && modelRef.current === 'end') {
            const startDate = moment(rangeValue[0]);
            const maxEndDate = moment(startDate).add(7, 'days');
            // 如果是第7天，需要禁用超过开始时间的小时和分钟
            if (date.format('YYYY-MM-DD') === maxEndDate.format('YYYY-MM-DD')) {
              const startHour = startDate.hours();
              const startMinute = startDate.minutes();
              return {
                disabledHours: () => {
                  return Array.from({ length: 24 }, (_, i) => i).filter(h => h > startHour);
                },
                disabledMinutes: (selectedHour) => {
                  if (selectedHour === startHour) {
                    return Array.from({ length: 60 }, (_, i) => i).filter(m => m > startMinute);
                  }
                  return [];
                },
                disabledSeconds: (selectedHour, selectedMinute) => {
                  return [];
                }
              };
            } else if (date.format('YYYY-MM-DD') === startDate.format('YYYY-MM-DD')) {
              const startHour = startDate.hours();
              const startMinute = startDate.minutes();
              return {
                disabledHours: () => {
                  return Array.from({ length: 24 }, (_, i) => i).filter(h => h < startHour);
                },
                disabledMinutes: (selectedHour) => {
                  if (selectedHour === startHour) {
                    return Array.from({ length: 60 }, (_, i) => i).filter(m => m <= startMinute);
                  }
                  return [];
                },
                disabledSeconds: (selectedHour, selectedMinute) => {
                  return [];
                }
              };
            }
          }
          if (rangeValue?.[1] && modelRef.current === 'start') {
            const endDate = moment(rangeValue[1]);
            const minStartDate = moment(endDate).subtract(7, 'days');
            // 如果是第7天，需要禁用早于结束时间的小时和分钟
            if (date.format('YYYY-MM-DD') === minStartDate.format('YYYY-MM-DD')) {
              const endHour = endDate.hours();
              const endMinute = endDate.minutes();
              // 不只是早于结束时间的时分，本身就在禁用时间分片中的时分那也不能再次放开啊
              // 先找到这个日期是否在时间分片中
              const isInServiceTime = serviceTimeRange?.find(i => {
                const pieceBegin = moment(i.begin);
                const pieceEnd = moment(i.end);
                // 只看begin和end的就行 中间不用看，中间的在日期禁用中已全天禁用，不会走到这儿
                return date.format('YYYY-MM-DD') === pieceBegin.format('YYYY-MM-DD') || date.format('YYYY-MM-DD') === pieceEnd.format('YYYY-MM-DD')
              })
              const disabledHours = [];
              const disabledMinutes = [];
              if (isInServiceTime) {
                const beginPiece = moment(isInServiceTime.begin);
                const endPiece = moment(isInServiceTime.end);
                if (date.format('YYYY-MM-DD') === beginPiece.format('YYYY-MM-DD')) {
                  const beginHour = beginPiece.hours();
                  const beginMinute = beginPiece.minutes();
                  for (let i = beginHour + 1; i < 24; i++) {
                    disabledHours.push(i);
                  }
                  for (let i = beginMinute + 1; i < 60; i++) {
                    disabledMinutes.push(i);
                  }
                }
                if (date.format('YYYY-MM-DD') === endPiece.format('YYYY-MM-DD')) {
                  const pendHour = endPiece.hours();
                  const pendMinute = endPiece.minutes();
                  for (let i = 0; i < pendHour; i++) {
                    disabledHours.push(i);
                  }
                  for (let i = 0; i < pendMinute; i++) {
                    disabledMinutes.push(i);
                  }
                  return {
                    disabledHours: () => {
                      return Array.from({ length: 24 }, (_, i) => i).filter(h => h < endHour || disabledHours.includes(h));
                    },
                    disabledMinutes: (selectedHour) => {
                      if (selectedHour === pendHour) {
                        return Array.from({ length: 60 }, (_, i) => i).filter(m => m < pendMinute || disabledMinutes.includes(m));
                      }
                      if (selectedHour === endHour) {
                        return Array.from({ length: 60 }, (_, i) => i).filter(m => m < endMinute);
                      }
                      return [];
                    },
                    disabledSeconds: (selectedHour, selectedMinute) => {
                      return [];
                    }
                  }
                }
                return {
                  disabledHours: () => {
                    return Array.from({ length: 24 }, (_, i) => i).filter(h => h < endHour);
                  },
                  disabledMinutes: (selectedHour) => {
                    if (selectedHour === endHour) {
                      return Array.from({ length: 60 }, (_, i) => i).filter(m => m < endMinute);
                    }
                    return []
                  },
                  disabledSeconds: (selectedHour, selectedMinute) => {
                    return [];
                  }
                };
              }
            }
          }
        }
        return {
          disabledHours: () => [],
          disabledMinutes: selectedHour => {
            return [];
          },
          disabledSeconds: (selectedHour, selectedMinute) => {
            return [];
          }
        };
      } catch (error) {
        console.error(error)
      }
    }, [rangeType, rangeValue, modelRef.current]);


  // reversion_time &implementation_time should within change_schedule_time
  const disabledDateLimit = useCallback(
    current => {
      if (limitTimes && fieldCode == 'Reversion_Time') {
        return current && (current.isBefore(limitTimes.startDate, 'day') || current.isAfter(limitTimes.endDate, 'day'))
      }
      if (implementationTime && fieldCode == 'Implementation_Time') {
        return current && (current.isBefore(implementationTime.startDate, 'day') || current.isAfter(implementationTime.endDate, 'day'))
      }
      if (_timeSelectRangeType === 'ANY') return false;
      if (rangeType === 'CUSTOM') {
        if (dateRange) {
          const { dateMaxLimit, dateMinLimit } = dateRange;
          const _dateRange = [];
          // 处理最小日期限制
          if (dateMinLimit) {
            const { addon, key, days, id } = dateMinLimit;
            if (addon === 'before') {
              if (key === 'today_before') {
                const _startDate = moment().subtract(days, 'day');
                _dateRange[0] = _startDate.startOf('day');
              }
            } else if (!addon && key === 'today') {
              const _startDate = moment();
              _dateRange[0] = _startDate.startOf('day');
            } else if (addon === 'after') {
              if (key === 'today_after') {
                const _startDate = moment().add(days, 'day');
                _dateRange[0] = _startDate.startOf('day');
              }
            } else if (addon === EnumDateRange.thisWeek) {
              if (key === EnumDateRange.thisWeek) {
                if (obtainCurrentLanguageState() === 'en') {
                  _dateRange[0] = moment()
                    .startOf('week')
                    .add(1, 'day');
                } else {
                  _dateRange[
                    _timeSelectRangeType === 'ONLY_RANGE' ? 0 : 1
                  ] = moment().startOf('week');
                }
              }
            } else if (addon === EnumDateRange.thisMonth) {
              if (key === EnumDateRange.thisMonth) {
                _dateRange[0] = moment().startOf('month');
              }
            } else if (addon === EnumDateRange.thisYear) {
              if (key === EnumDateRange.thisYear) {
                _dateRange[0] = moment().startOf('year');
              }
            } else {
              if (!addon) {
                // 自定义时间
                if (key === 'defined' && dateMinLimit?.defined) {
                  _dateRange[0] = moment(mostValuesRef.current.min).startOf('day');
                } else {
                  let _startDate = mostValuesRef.current.min;
                  if (_startDate) {
                    _dateRange[0] = moment(_startDate).startOf('day');
                  }
                }
              }
            }
          }
          // 处理最大日期限制
          if (dateMaxLimit) {
            const { addon, key, days, id } = dateMaxLimit;
            if (addon === 'before') {
              if (key === 'today_before') {
                const _endDate = moment().subtract(days, 'day');
                _dateRange[1] = _endDate.endOf('day');
              }
            } else if (!addon && key === 'today') {
              const _endDate = moment();
              _dateRange[1] = _endDate.endOf('day');
            } else if (addon === 'after') {
              if (key === 'today_after') {
                const _endDate = moment().add(days, 'day');
                _dateRange[1] = _endDate.endOf('day');
              }
            } else if (addon === EnumDateRange.thisWeek) {
              if (key === EnumDateRange.thisWeek) {
                if (obtainCurrentLanguageState() === 'en') {
                  _dateRange[1] = moment()
                    .endOf('week')
                    .add(1, 'day');
                } else {
                  _dateRange[1] = moment().endOf('week');
                }
              }
            } else if (addon === EnumDateRange.thisMonth) {
              if (key === EnumDateRange.thisMonth) {
                _dateRange[1] = moment().endOf('month');
              }
            } else if (addon === EnumDateRange.thisYear) {
              if (key === EnumDateRange.thisYear) {
                _dateRange[1] = moment().endOf('year');
              }
            } else {
              if (!addon) {
                // 自定义时间
                if (key === EnumDateRange.defined && dateMaxLimit?.defined) {
                  _dateRange[1] = moment(mostValuesRef.current.max).endOf('day');
                } else {
                  let _endDate = mostValuesRef.current.max;
                  if (_endDate) {
                    _dateRange[1] = moment(_endDate).endOf('day');
                  }
                }
              }
            }
          }
          // 根据日期范围判断是否禁用
          if (_dateRange[0] && !_dateRange[1]) {
            return current < _dateRange[0];
          } else if (_dateRange[1] && !_dateRange[0]) {
            return current > _dateRange[1];
          } else if (_dateRange[0] && _dateRange[1]) {
            return !(current >= _dateRange[0] && current <= _dateRange[1])
          } else {
            return false;
          }
        } else {
          return false;
        }
      } else {
        if (serviceTimeRange && serviceTimeRange?.length) {
          const _dateRanges = serviceTimeRange.map(i => ({
            begin: moment(i.begin),
            end: moment(i.end)
          }));
          if (_timeSelectRangeType === 'ONLY_RANGE') {
            return !_dateRanges.some(
              i =>
                i.begin.startOf('day') <= current &&
                i.end.endOf('day') >= current
            );
          } else {
            let result = calcServiceTime(serviceTimeRange, current);
            if (result) {
              return result.disabledHours().length === 24;
            }
            return false;
          }
        } else {
          return false;
        }
      }
    },
    [rangeType, serviceTimeRange, _timeSelectRangeType, rangeValue, modelRef.current]
  );

  // 辅助函数，生成指定范围的数组
  const getDateRange = (start, end) => {
    const result = [];
    for (let i = start;i < end;i++) {
      result.push(i);
    }
    return result;
  }

  // reversion_time & implementation_time should within schedule time
  const _disabledTimeLimit = useCallback(
    (date, partical) => {
      if (partical) modelRef.current = partical;
      if (!date) {
        return {
          disabledHours: () => Array.from({ length: 24 }, (_, index) => index),
          disabledMinutes: () => Array.from({ length: 60 }, (_, index) => index),
          disabledSeconds: () => Array.from({ length: 60 }, (_, index) => index),
        };
      }
      if (date && modelRef.current === 'start' && limitTimes && fieldCode == 'Reversion_Time') {
        const startMoment = moment(limitTimes.startDate)
        const endMoment = moment(limitTimes.endDate);
        return {
          disabledHours: () => {
            if (date.isSame(startMoment, 'day') && date.isSame(endMoment, 'day')) {
              // 开始和结束日期是同一天
              return [...getDateRange(0, startMoment.hour()), ...getDateRange(endMoment.hour() + 1, 24)];
            } else if (date.isSame(startMoment, 'day')) {
              // 只是开始日期
              return getDateRange(0, startMoment.hour());
            } else if (date.isSame(endMoment, 'day')) {
              // 只是结束日期
              return getDateRange(endMoment.hour() + 1, 24);
            }
            return [];
          },
          disabledMinutes: (selectedHour) => {
            if (date.isSame(startMoment, 'day') && date.isSame(endMoment, 'day')) {
              // 开始和结束日期是同一天
              if (selectedHour === startMoment.hour() && selectedHour === endMoment.hour()) {
                const maxMinute = endMoment.minutes()
                const minMinute = startMoment.minutes()
                return Array.from({ length: 60 }, (_, index) => index).filter(i => i < minMinute || i > maxMinute)
              }
              if (selectedHour === startMoment.hour()) {
                return getDateRange(0, startMoment.minute());
              } else if (selectedHour === endMoment.hour()) {
                return getDateRange(endMoment.minute() + 1, 60);
              }
            } else if (date.isSame(startMoment, 'day') && selectedHour === startMoment.hour()) {
              // 只是开始日期
              return getDateRange(0, startMoment.minute());
            } else if (date.isSame(endMoment, 'day') && selectedHour === endMoment.hour()) {
              // 只是结束日期
              return getDateRange(endMoment.minute() + 1, 60);
            }
            return [];
          },
          disabledSeconds: () => []
        };
      }
      if (date && modelRef.current === 'end' && limitTimes && fieldCode == 'Reversion_Time') {
        const endMoment = moment(limitTimes.endDate);
        const startMoment = moment(rangeValue?.[0] || limitTimes.startDate)
        if (date.isSame(endMoment, 'day') && date.isSame(startMoment, 'day')) {
          return {
            disabledHours: () => [
              ...getDateRange(0, startMoment.hour()),
              ...getDateRange(endMoment.hour() + 1, 24)
            ],
            disabledMinutes: (selectedHour) => {
              if (selectedHour === startMoment.hour() && selectedHour === endMoment.hour()) {
                const maxMinute = endMoment.minutes()
                const minMinute = startMoment.minutes()
                return Array.from({ length: 60 }, (_, index) => index).filter(i => i < minMinute || i > maxMinute)
              }
              if (selectedHour === startMoment.hour()) {
                return getDateRange(0, startMoment.minute());
              }
              if (selectedHour === endMoment.hour()) {
                return getDateRange(endMoment.minute() + 1, 60);
              }
              return [];
            },
          };
        } else if (date.isSame(endMoment, 'day')) {
          return {
            disabledHours: () => getDateRange(endMoment.hour() + 1, 24),
            disabledMinutes: (selectedHour) => {
              if (selectedHour === endMoment.hour()) {
                return getDateRange(endMoment.minute() + 1, 60);
              }
              return [];
            },
          };
        } if (date.isSame(startMoment, 'day')) {
          // please check it with mr , maybe convert when sync code.
          // 添加这个判断，处理结束日期与开始日期相同的情况
          return {
            disabledHours: () => getDateRange(0, startMoment.hour()),
            disabledMinutes: (selectedHour) => {
              if (selectedHour === startMoment.hour()) {
                return getDateRange(0, startMoment.minute());
              }
              return [];
            },
          };
        }
      }

      // 处理implement时间范围
      if (date && modelRef.current === 'end' && implementationTime && fieldCode == 'Implementation_Time') {
        const endMoment = moment(implementationTime.endDate);
        const startMoment = moment(implementationTime.startDate)
        if (date.isSame(endMoment, 'day') && date.isSame(startMoment, 'day')) {
          return {
            disabledHours: () => [
              ...getDateRange(0, startMoment.hour()),
              ...getDateRange(endMoment.hour() + 1, 24)
            ],
            disabledMinutes: (selectedHour) => {
              if (selectedHour === startMoment.hour() && selectedHour === endMoment.hour()) {
                const maxMinute = endMoment.minutes()
                const minMinute = startMoment.minutes()
                return Array.from({ length: 60 }, (_, index) => index).filter(i => i < minMinute || i > maxMinute)
              }
              if (selectedHour === startMoment.hour()) {
                return getDateRange(0, startMoment.minute());
              }
              if (selectedHour === endMoment.hour()) {
                return getDateRange(endMoment.minute() + 1, 60);
              }
              return [];
            },
          };
        } else if (date.isSame(endMoment, 'day')) {
          // 原有的结束日期逻辑
          return {
            disabledHours: () => getDateRange(endMoment.hour() + 1, 24),
            disabledMinutes: (selectedHour) => {
              if (selectedHour === endMoment.hour()) {
                return getDateRange(endMoment.minute() + 1, 60);
              }
              return [];
            },
          };
        } else if (date.isSame(startMoment, 'day')) {
          // 原有的开始日期逻辑
          return {
            disabledHours: () => getDateRange(0, startMoment.hour()),
            disabledMinutes: (selectedHour) => {
              if (selectedHour === startMoment.hour()) {
                return getDateRange(0, startMoment.minute());
              }
              return [];
            },
          };
        }
      }
    },
    [rangeType, serviceTimeRange, _timeSelectRangeType, rangeValue, modelRef.current]
  );

  // 处理日期选择器打开/关闭
  const onOpenChange = open => {
    if (fieldCode == 'Implementation_Time') {
      if (!allowOpen) return;
    }
    try {
      if (open) {
        // auto selected min datetime
        if (fieldCode == 'Implementation_Time') {
          if (rangeValue && !rangeValue?.[1] && rangeValue[0]) {
            rangeValue[1] = rangeValue[0].clone().add(1, 'minute')
          }
        }
        const { dateMaxLimit, dateMinLimit } = dateRange || {};
        // 获取最小日期限制
        if (dateMinLimit && !dateMinLimit?.addon) {
          if (dateMinLimit.key === 'defined' && dateMinLimit?.defined) {
            mostValuesRef.current.min = dateMinLimit?.defined;
          } else if (dateMinLimit?.id) {
            t?.actions?.getFieldValue(dateMinLimit.id)?.then(time => {
              mostValuesRef.current.min = time;
            });
          }
        }
        // 获取最大日期限制
        if (dateMaxLimit && !dateMaxLimit?.addon) {
          if (dateMaxLimit.key === 'defined' && dateMaxLimit?.defined) {
            mostValuesRef.current.max = dateMaxLimit.defined;
          } else if (dateMaxLimit?.id) {
            t?.actions?.getFieldValue(dateMaxLimit.id)?.then(time => {
              mostValuesRef.current.max = time;
            });
          }
        }
        // // 获取扩展时间范围
        if (useExtend) {
          t.actions.getFormState(state => {
            const formData = { ...(state.values || {}), ...(t.baseActions.getBaseValue() || {}) }
            getDateRangePieces({
              formId: t.orderInfo.formId,
              formData,
              fieldCode,
              extendClassId: extendSetting[0].id,
            }).then(res => {
              if (res.code === 100000) {
                setServiceTimeRange(res.data || []);
              }
            });
          })
        }

        // 如果当前没有选中值，设置一个合法的默认值
        if (fieldCode !== 'Implementation_Time' && (!rangeValue || !rangeValue[modelRef.current === 'start' ? 0 : 1])) {
          const now = moment();
          const currentHour = now.hours();
          const currentMinute = now.minutes();
          // 获取当前时间的禁用状态
          const disabledTimes = _disabledTime(now, modelRef.current);
          if (disabledTimes) {
            const disabledHours = disabledTimes.disabledHours();
            // 如果当前小时被禁用，找到第一个可用的小时
            if (disabledHours.includes(currentHour)) {
              for (let h = 0; h < 24; h++) {
                if (!disabledHours.includes(h)) {
                  // 找到可用的小时后，设置为这个小时的00分
                  const validTime = now.clone().hours(h).minutes(0).seconds(0);
                  if (modelRef.current === 'start') {
                    setRangeValue([validTime, rangeValue?.[1]]);
                  } else {
                    setRangeValue([rangeValue?.[0], validTime]);
                  }
                  break;
                }
              }
            } else {
              // 当前小时可用，检查分钟是否可用
              const disabledMinutes = disabledTimes.disabledMinutes(currentHour);
              if (disabledMinutes.includes(currentMinute)) {
                // 在当前小时内找到第一个可用的分钟
                for (let m = 0; m < 60; m++) {
                  if (!disabledMinutes.includes(m)) {
                    const validTime = now.clone().minutes(m).seconds(0);
                    if (modelRef.current === 'start') {
                      setRangeValue([validTime, rangeValue?.[1]]);
                    } else {
                      setRangeValue([rangeValue?.[0], validTime]);
                    }
                    break;
                  }
                }
              }
            }
          }
        }
      } else {
        if (fieldCode !== 'Implementation_Time') {
          // 关闭时处理值
          if (!rangeValue) {
            setRangeValue(undefined)
          }
          if (rangeValue && rangeValue?.[0] && rangeValue?.[1]) {
            const startTime = rangeValue[0].format("YYYY-MM-DD HH:mm")
            const endTime = rangeValue[1].format("YYYY-MM-DD HH:mm")
            let type = startTime !== endTime
            if ((!type && fieldCode == 'Reversion_Time')) {
              handleChange(rangeValue)
            } else if (type) {
              handleChange(rangeValue)
            } else {
              let copyRangeValue = [...rangeValue]
              rangeValue.forEach(item => copyRangeValue.push(item))
              modelRef.current == 'start' ? copyRangeValue[0] = undefined : copyRangeValue[1] = undefined
              setRangeValue(copyRangeValue)
            }
          } else {
            handleChange(rangeValue)
          }
        } else {
          handleChange(rangeValue)
        }
      }
      setOpen(open);
    } catch (error) {
      console.error(error)
    }
  };
  // 处理值变化
  const value = useMemo(() => {
    if (!_value) {
      setRangeValue(null)
      return null
    }
    if (_value?.startDate && _value?.endDate) {
      setRangeValue([moment(_value?.startDate), moment(_value?.endDate)])
      return [moment(_value?.startDate), moment(_value?.endDate)]
    } else {
      setRangeValue([_value.startDate ? moment(_value?.startDate) : null, _value.endDate ? moment(_value?.endDate) : null])
      return [_value.startDate ? moment(_value?.startDate) : null, _value.endDate ? moment(_value?.endDate) : null]
    }
  }, [_value])



  // 获取下一个可用的小时
  function getNextAvailableHour(bannedHours, currentHour) {
    if (!bannedHours.includes(currentHour)) return currentHour
    const banned = new Set(bannedHours);
    if (banned.size === 24) return undefined; // 所有小时均被禁用
    if (banned.size === 0) return 0; // 无禁用小时，默认返回0
    const maxBanned = Math.max(...bannedHours);
    let candidate = (maxBanned + 1) % 24;
    while (banned.has(candidate)) {
      candidate = (candidate + 1) % 24;
    }
    return candidate;
  }
  // 获取下一个可用的分钟或秒
  function getNextAvailableMAndS(bannedTimes, currentHour) {
    if (!bannedTimes.includes(currentHour)) return currentHour
    const banned = new Set(bannedTimes);
    if (banned.size === 60) return undefined; // 所有时间均被禁用
    if (banned.size === 0) return 0; // 无禁用时间，默认返回0
    const maxBanned = Math.max(...bannedTimes);
    let candidate = (maxBanned + 1) % 60;
    while (banned.has(candidate)) {
      candidate = (candidate + 1) % 60;
    }
    return candidate;
  }

  const disabledTime = (...args) => {
    if (fieldCode === 'Implementation_Time' || fieldCode === 'Reversion_Time') return _disabledTimeLimit(...args)
    if(fieldCode === 'scheduleTime') return _disabledTimeSchedule(...args)
    return _disabledTime(...args)
  }
  const disabledDate = (...args) => {
    if (fieldCode === 'Implementation_Time' || fieldCode === 'Reversion_Time') return disabledDateLimit(...args)
    if(fieldCode === 'scheduleTime') return disabledDateSchedule(...args)
    return _disabledDate(...args)
  }

  // 渲染组件
  return (
    <div className={styles['dynamic-date']} ref={wrapperRef}>
      {disabled ? (
        <div className={styles['readonly-date']}>
          {value ? `${value?.[0]?.format?.(_dateFormat) || ''} - ${value?.[1]?.format?.(_dateFormat) || ''}` : '--'}
        </div>
      ) : (
        <DatePicker.RangePicker
          defaultPickerValue={rangeValue && (fieldCode == 'Implementation_Time' && rangeValue) ? [moment(rangeValue[0]), moment(implementationTime?.startDate).add(1, 'minutes')] : undefined}
          value={rangeValue}
          disabledDate={disabledDate}
          onChange={handleChange}
          showTime={[
            EnumDateFormatType.all,
            EnumDateFormatType.yearMonthDayHoursMinutes
          ].includes(dateFormat)}
          format={_dateFormat}
          suffixIcon={_suffixIcon}
          onOpenChange={onOpenChange}
          onCalendarChange={(dates) => {
            if (fieldCode == 'Implementation_Time') {
              setOpen(false)
              handleChange(dates)
            }
          }}
          open={open}
          dropdownClassName={`fs-${formLayout?.fontSize}`}
          getPopupContainer={getPopupContainer || (() => document.body)}
          disabledTime={disabledTime}
          onPickerValueChange={(current) => {
            if (!current) return;
            const disabledTimes = disabledTime(current)
            if (disabledTimes && disabledTimes.disabledHours && current) {
              try {
                const disabledHours = disabledTimes.disabledHours()
                const candidate = getNextAvailableHour(disabledHours, current.hours())
                const disabledMinutes = disabledTimes.disabledMinutes(candidate)
                const m = getNextAvailableMAndS(disabledMinutes, current.minutes()) ?? current.minutes()
                const time = current.clone().hours(candidate).minutes(m).seconds(0)
                if (!moment.isMoment(time)) return;
                if (modelRef.current == 'start') {
                  if (current > rangeValue?.[1]) {
                    setRangeValue([time, null])
                  } else {
                    setRangeValue([time, rangeValue?.[1]])
                  }
                } else {
                  setRangeValue([rangeValue?.[0], time])
                }
              } catch (error) {
                console.error('Error in disabledTimes handling:', error);
              }
            } else {
              if (modelRef.current == 'start') {
                if (current > rangeValue?.[1]) {
                  setRangeValue([current, null])
                } else {
                  setRangeValue([current, rangeValue?.[1]])
                }
              } else {
                setRangeValue([rangeValue?.[0], current])
              }
            }
          }}
        />
      )}
    </div>
  );
};



export default IDate;

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

import { intl } from '@chaoswise/intl';
import { theme } from '@/theme';
import { DynamicEnumType, EnumType } from '@/constants/common/formType';
import {
  EnumDateFormatType,
  EnumDateRange,
  EnumDateInitValue,
} from '../../../../../constants';
import { commonSchema } from '../commonSchema';

import { langUtil } from '@/lang';

import { Icon, Tooltip } from '@chaoswise/ui';
export const schema = {
  type: 'object',
  properties: {
    publicFieldName: commonSchema.publicFieldName,
    fieldName: commonSchema.fieldName,
    fieldCode: commonSchema.fieldCode,
    dateFormatValue: {
      name: 'dateFormatValue',
      get title() {
        return intl.get('0b37b15b-e8de-464f-8942-b6f5fc3e6ad2').d('日期格式');
      },
      type: 'string',
      'x-component': DynamicEnumType?.dateFormatValue,
      'x-props': {
        dataSource: [
          {
            get label() {
              return intl
                .get('a52c814c-92da-42f2-adee-c959ac901384')
                .d('年月日');
            },
            value: EnumDateFormatType.yearMonthDay,
          },
          {
            get label() {
              return intl
                .get('2d1a324f-1543-43ab-bd27-275fc7162ffe')
                .d('年月日时分秒');
            },
            value: EnumDateFormatType.all,
          },
          {
            get label() {
              return intl
                .get('01a8fa49-6548-4041-a34f-aa414b51ad8e')
                .d('年月日时分');
            },
            value: EnumDateFormatType.yearMonthDayHoursMinutes,
          },
        ],

        defaultFormat: EnumDateFormatType.yearMonthDay,
      },
      'x-rules': [],
    },
    rangeType: {
      //范围类型
      name: 'rangeType',
      colon: false,
      get title() {
        return intl.get('bc2940ac-2d01-43c3-ab70-ce89c152b0e6').d('时间范围');
      },
      'x-component': DynamicEnumType?.rangeTypeRadio,
      readOnly: false,
      'x-props': {
        options: [
          {
            get label() {
              return (
                <div
                  style={{ verticalAlign: 'middle', display: 'inline-block' }}
                >
                  {intl.get('6c271021-8697-498a-8e06-d848d25c11fb').d('自定义')}
                  <span>：</span>
                  <Tooltip
                    title={intl
                      .get('54aa99c9-51ea-471b-a235-3d745feb6c10')
                      .d(
                        '可以设置日期的动态范围，也可以与其他日期类字段形成限制，日期范围限制为大于等于/小于等于'
                      )}
                  >
                    <Icon type='question-circle' />
                  </Tooltip>
                  <span
                    style={{
                      background: theme.background_color_33,
                      position: 'absolute',
                      zIndex: '998',
                      display: 'inline-block',
                      // width: '3em',
                      // height: '1em',
                      top: '1px',
                    }}
                  >
                    &nbsp;
                  </span>
                </div>
              );
            },
            value: 'CUSTOM',
          },
          {
            get label() {
              return (
                <div
                  style={{ verticalAlign: 'middle', display: 'inline-block' }}
                >
                  {intl
                    .get('cc22685f-ff5f-46af-9bf9-b884017c35de')
                    .d('按服务时间')}
                  <span>：</span>
                  <Tooltip
                    title={intl
                      .get('1ae4a848-9d78-4544-a9b5-2bae19ffbb63')
                      .d(
                        '该设置用于设置用户在填写工单可选择的时间范围，可选多个服务时间作为时间范围。设置好时间范围后需要对时间校验规则进行设置，有3个规则可选，分别是允许选择任意时间、允许选择范围内时间、不允许选择范围内时间，单选，默认选择允许选择任意时间。'
                      )}
                  >
                    <Icon type='question-circle' />
                  </Tooltip>
                  <span
                    style={{
                      background: theme.background_color_33,
                      position: 'absolute',
                      zIndex: '998',
                      display: 'inline-block',
                      // width: '3em',
                      // height: '1em',
                      top: '1px',
                    }}
                  >
                    &nbsp;
                  </span>
                </div>
              );
            },
            value: 'SERVICETIME',
          },
          {
            get label() {
                return intl.get('deb6147e-b07d-4f6c-ba52-4b0b9ce872c6').d('扩展类')
            },
            value: "EXTEND"
          }
        ],
      },
    },
    dateRange: {
      //时间范围
      name: 'dateRange',
      colon: false,
      type: 'string',
      'x-component': DynamicEnumType?.dateRange,
      readOnly: false,
      'x-props': {
        initOptions: [
          {
            id: EnumDateRange.unlimited,
            key: EnumDateRange.unlimited,
            get label() {
              return langUtil.t(
                intl.get('41e9c11e-3d8b-46a1-aad1-759c22efd849').d('无限制')
              );
            },
            component: false,
          },
          {
            id: EnumDateRange.today,
            key: EnumDateRange.today,
            get label() {
              return langUtil.t(
                intl.get('6ce11558-7abc-4de7-81a1-62b272fad083').d('今天')
              );
            },
            component: false,
          },
          {
            id: EnumDateRange.today,
            key: EnumDateRange.todayBefore,
            get label() {
              return langUtil.t(
                intl.get('a73dd469-bc43-47fd-9482-6f1f2fc2b78f').d('今天前')
              );
            },
            component: true,
            addon: 'before',
            days: 1,
          },
          {
            id: EnumDateRange.today,
            key: EnumDateRange.todayAfter,
            get label() {
              return langUtil.t(
                intl.get('3dde7e01-d9ce-4834-b488-539f4b272ae7').d('今天后')
              );
            },
            component: true,
            addon: 'after',
            days: 1,
          },
          {
            id: EnumDateRange.thisWeek,
            key: EnumDateRange.thisWeek,
            addon: 'thisWeek',
            get label() {
              return langUtil.t(
                intl.get('141318cd-e5f9-4582-87f7-12c03f6b6655').d('本周')
              );
            },
          },
          {
            id: EnumDateRange.thisMonth,
            key: EnumDateRange.thisMonth,
            addon: 'thisMonth',
            get label() {
              return langUtil.t(
                intl.get('0cd6870d-d30d-4f91-8bc0-d9f3ffc4ecb7').d('本月')
              );
            },
          },
          {
            id: EnumDateRange.thisYear,
            key: EnumDateRange.thisYear,
            addon: 'thisYear',
            get label() {
              return langUtil.t(
                intl.get('6ab79548-1909-4efa-be91-dd68d80003a5').d('本年')
              );
            },
          },
          {
            id: EnumDateInitValue.defined,
            key: EnumDateInitValue.defined,
            get label() {
              return langUtil.t(
                intl.get('6c271021-8697-498a-8e06-d848d25c11fb').d('自定义')
              );
            },
            component: true,
          },
        ],
      },
      'x-rules': [],
    },

    serviceTimeIds: {
      //时间范围
      name: 'serviceTimeIds',
      colon: false,
      type: 'array',
      'x-component': DynamicEnumType?.serviceTimeRange,
      readOnly: false,
      'x-props': {},
      'x-rules': [],
    },
    timeSelectRangeType: {
      name: 'timeSelectRangeType',
      colon: false,
      readOnly: false,
      required: true,
      'x-component': DynamicEnumType?.timeRangType,
      'x-props': {
        defaultValue: 'ONLY_RANGE',
        initOptions: [
          {
            id: 'ANY',
            key: 'ANY',
            get label() {
              return intl
                .get('16212dd1-c086-46a1-92f7-3a6347ba473c')
                .d('允许选择任意时间');
            },
          },
          {
            id: 'ONLY_RANGE',
            key: 'ONLY_RANGE',
            get label() {
              return intl
                .get('6eae34bb-767a-4d60-b403-197b6ad954f3')
                .d('允许选择范围内时间');
            },
          },
          {
            id: 'ONLY_RANGE_OUT',
            key: 'ONLY_RANGE_OUT',
            get label() {
              return intl
                .get('d162909f-5b7b-4685-ad42-dbf58316a6bd')
                .d('不允许选择范围内时间');
            },
          },
        ],
      },
      get title() {
        return intl
          .get('28ddc2c9-356c-44b8-b853-951c9e8bafef')
          .d('时间校验规则');
      },
    },
    extendSetting: {
      name: 'extendSetting',
      colon: false,
      type: 'array',
      'x-component': DynamicEnumType?.extendSetting,
      readOnly: false,
      'x-props': {},
      'x-rules': [
        {
          required: true,
          message: intl.get('90459ec5-25dc-4d5a-b097-ad968c39746f').d('请选择扩展类')
        }
      ],
    },
    dataDefault: {
      // 默认值
      name: 'dataDefault',
      colon: false,
      get title() {
        return intl.get('fffa8517-67ee-4378-94b8-ddd90d15bca5').d('默认值');
      },
      type: 'string',
      'x-component': DynamicEnumType?.dateInitValue,
      readOnly: false,
      'x-props': {
        initOptions: [
          {
            id: EnumDateInitValue.none,
            key: EnumDateInitValue.none,
            get label() {
              return langUtil.t(
                intl.get('510f05cd-0d74-48d3-a6bc-15959c359f9e').d('无')
              );
            },
            component: false,
          },
          {
            id: EnumDateInitValue.today,
            key: EnumDateInitValue.today,
            get label() {
              return langUtil.t(
                intl.get('bcde096a-3a9b-4775-becd-7a8d12a6a1e9').d('当天时间')
              );
            },
            component: false,
          },
          {
            id: EnumDateInitValue.today,
            key: EnumDateInitValue.todayBefore,
            get label() {
              return langUtil.t(
                intl.get('28c21c3d-8843-4a76-b9dd-62db72f34629').d('当天时间前')
              );
            },
            component: true,
            addon: 'before',
          },
          {
            id: EnumDateInitValue.today,
            key: EnumDateInitValue.todayAfter,
            get label() {
              return langUtil.t(
                intl.get('7cb21ce7-b686-43a8-8630-4b592a5af910').d('当天时间后')
              );
            },
            component: true,
            addon: 'after',
          },
          {
            id: EnumDateInitValue.defined,
            key: EnumDateInitValue.defined,
            get label() {
              return langUtil.t(
                intl.get('6c271021-8697-498a-8e06-d848d25c11fb').d('自定义')
              );
            },
            component: true,
            type: 'dateRange'
          },
        ],

        defaultValue: EnumDateInitValue.none,
      },
      'x-rules': [],
    },
    fieldHint: commonSchema.getFieldContent(EnumType.date),
    fieldWidth: commonSchema.fieldWidth,
    supportCopy: commonSchema.supportCopy,
  },
  labelWidth: 120,
  displayType: 'row',
};



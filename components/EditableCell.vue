<template>
  <input
    v-if="isEditing"
    type="text"
    v-model="currentValue"
    @blur="handleBlur"
    @keydown.enter="handleBlur"
    @keydown.esc="cancelEdit"
    ref="inputRef"
    class="w-full px-1 py-0.5 border border-indigo-300 rounded-md bg-white outline-none ring-2 ring-indigo-200 text-xs"
  />
  <span 
    v-else 
    @dblclick="startEdit" 
    class="block w-full h-full px-2 py-1.5 cursor-pointer min-h-[20px]"
  >
    {{ modelValue }}
  </span>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{ modelValue: string | number }>();
const emit = defineEmits(['update:modelValue']);

const isEditing = ref(false);
const currentValue = ref(props.modelValue);
const inputRef = ref<HTMLInputElement | null>(null);

watch(() => props.modelValue, (val) => {
  currentValue.value = val;
});

const startEdit = async () => {
  isEditing.value = true;
  await nextTick();
  inputRef.value?.focus();
};

const handleBlur = () => {
  emit('update:modelValue', String(currentValue.value));
  isEditing.value = false;
};

const cancelEdit = () => {
  currentValue.value = props.modelValue;
  isEditing.value = false;
};
</script>
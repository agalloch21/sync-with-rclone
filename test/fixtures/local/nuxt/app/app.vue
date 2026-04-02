<script setup lang="ts">
useSeoMeta({
  title: '数字余华',
  ogTitle: '数字余华',
  description: '一个基于AI的余华风格对话机器人',
  ogDescription: '一个基于AI的余华风格对话机器人',
  ogImage: '/ogimage.jpg',
  twitterCard: 'summary_large_image',
})

useHead({
  script: [{
    tagPosition: 'head',
    innerHTML: `
(()=>{try{
  const r=document.documentElement;
  const clamp=(x,min,max)=>x<min?min:x>max?max:x;
  const w=innerWidth||r.clientWidth;
  const h=(visualViewport&&visualViewport.height)||innerHeight||r.clientHeight;
  const sw=w/1920, sh=h/1080;
  const s=clamp((sw+sh)*0.5,0.5,2);
  r.style.setProperty('--scale-w',''+sw);
  r.style.setProperty('--scale-h',''+sh);
  r.style.setProperty('--scale',''+s);
}catch(e){}})();`,
  }],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

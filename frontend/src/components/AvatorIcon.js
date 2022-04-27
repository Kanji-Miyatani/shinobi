import React,{useState,useEffect} from 'react';
function AvatorIcon({avatorType='shinobi',height}) {
    const [srcSvg,setSrcSvg]=useState('');
    function getSource(){
        console.log(`avatorType:${avatorType}`);
        //SVGファイルを動的に読み込み
        import(`../svg/${avatorType}.svg`).then(
            // defaultとして読み込んだモジュールを「src」という名前空間として、
            // then()のコールバック関数の引数に渡す
            ({ default: src }) => {
                setSrcSvg(src);
            }
          ).catch(err => {
          });
    }
    useEffect(()=>{
        getSource();
    },[avatorType]);
    const style = {
        height: height,       // 数値は"64px"のように、pxとして扱われます
        pointerEvents: 'none'
      };
  return (
    <div className="avatorIcon">
        <img src={srcSvg} style={style} alt="アバター" />
    </div>
  )
}

export default AvatorIcon
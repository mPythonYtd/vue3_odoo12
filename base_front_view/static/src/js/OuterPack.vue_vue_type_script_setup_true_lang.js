import{R as t}from"./RecordView.js";import{d as e,R as a,i as o,S as i,o as s}from"./index.js";const r=e({__name:"OuterPack",setup(e){let r=i();const d=a({id:parseInt(r.query.id)||0,type:r.query.type||"list",title:"赋码(外箱包装)",name:"outer_pack",limit:12,offset:0,domain:[],count:0,model:"srm.coding.outer.pack",fields:["name","product_id","product_name","amount","state","min_pack_size","min_pack_ids"],import_fields:["product_id","product_name","min_pack_size","amount","min_pack_ids"],tables:{}}),p={buttons:[{type:"edit",text:"编辑",showType:["form"],attributes:{}},{type:"create",text:"创建",showType:["list","form"]},{type:"object",method:"print_code",showType:["form","list"],text:"打印",needRow:!0,attributes:{}},{type:"import",showType:["list"],text:"导入",template:"/stock_manager/download_template/outer",attributes:{}}],search_fields:{product_id:{domain:[]}},attributes:{min_pack_ids:{domain:[["is_generate","=",!0]]},product_id:{readonly:[["state","=","done"]]}},invisible:["state"],readonly:["name","product_name","name","product_id"],required:["product_id","amount"]};return(e,a)=>(s(),o(t,{params:d,extras:p},null,8,["params"]))}});export{r as _};
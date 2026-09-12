package com.spaceshipflight.amitjoshi.spaceshipflight;

import android.os.Message;
import android.widget.ImageView;
import android.os.Handler;
import android.graphics.drawable.Drawable;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import java.util.ArrayList;
import android.util.AttributeSet;
import android.content.Context;

/**
 * Created by amitjoshi on 11/23/16.
 */
public class MyImageView extends ImageView {
    ArrayList<GameItem> list = new ArrayList<GameItem>();
    Bitmap bitmap = Bitmap.createBitmap(1080, 964, Bitmap.Config.ARGB_4444); //temporary fake bitmap
    static Handler handler; //make this static final
    public MyImageView(Context context){
        super(context);
        handler = new Handler(){
            @Override
            public void handleMessage(Message msg) {
                //setImageBitmap(Bitmap.createScaledBitmap(bitmap, bitmap.getWidth(), getMeasuredHeight(), false));
                for(GameItem g : list){
                    g.drawMe();
                }
                setImageBitmap(bitmap);
            }
        };
    }
    public MyImageView(Context context, AttributeSet attrs){
        super(context, attrs);

        handler = new Handler(){
            @Override
            public void handleMessage(Message msg) {
                //setImageBitmap(Bitmap.createScaledBitmap(bitmap, bitmap.getWidth(), getMeasuredHeight(), false));
                for(GameItem g : list){
                    g.drawMe();
                }
                setImageBitmap(bitmap);
            }
        };
    }
    public MyImageView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        handler = new Handler(){
            @Override
            public void handleMessage(Message msg) {
                //setImageBitmap(Bitmap.createScaledBitmap(bitmap, bitmap.getWidth(), getMeasuredHeight(), false));
                for(GameItem g : list){
                    g.drawMe();
                }
                setImageBitmap(bitmap);
            }
        };

    }
    public void pause(){

    }
    public void play(){

    }
    public void setGameItems(ArrayList<GameItem> l){
        this.list = l;
    }
    public void setBit(Bitmap bitmap1){
        this.bitmap = bitmap1;
    }
    @Override
    protected void onDraw(Canvas canvas){
        super.onDraw(canvas);
        handler.sendEmptyMessage(0);
    }
    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        try
        {
            Drawable drawable = getDrawable();

            if (drawable == null)
            {
                setMeasuredDimension(0, 0);
            }
            else
            {
                int width = MeasureSpec.getSize(widthMeasureSpec); //do the measure spec get size for height and use the screen's width for width
                int height = width * drawable.getIntrinsicHeight() / drawable.getIntrinsicWidth();
                //int height = MeasureSpec.getSize(heightMeasureSpec);
                setMeasuredDimension(width, height);
            }
        }
        catch (Exception e)
        {
            e.printStackTrace();
            super.onMeasure(widthMeasureSpec, heightMeasureSpec);
        }
    }
}

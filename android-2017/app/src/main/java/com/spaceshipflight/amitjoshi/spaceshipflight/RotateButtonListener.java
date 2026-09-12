package com.spaceshipflight.amitjoshi.spaceshipflight;
import android.os.SystemClock;
import android.support.v7.app.AppCompatActivity;
import android.view.MotionEvent;
import android.view.View.OnClickListener;
import android.os.Handler;
import android.view.View;
import android.view.View.OnTouchListener;
import android.view.ViewGroup;
import android.widget.Button;

/**
 * Created by amitjoshi on 12/26/16.
 */
public class RotateButtonListener implements View.OnTouchListener{
    private Handler handler = new Handler();
    private int interval;
    private AppCompatActivity activity;
    private Button button;
    private OnClickListener onClickListener;
    public RotateButtonListener(OnClickListener onClickListener, int interval, Button button, AppCompatActivity activity){
        this.interval = interval;
        this.activity = activity;
        this.button = button;
        this.onClickListener = onClickListener;
    }
    private View view;
    Runnable runnable = new Runnable() {
        @Override
        public void run() {
            handler.postDelayed(this, interval);
            onClickListener.onClick(view);
        }
    };
    public boolean onTouch(View view, MotionEvent motionEvent){
        if (view == this.button) {
            switch (motionEvent.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    handler.removeCallbacks(runnable);
                    handler.postDelayed(runnable, interval);
                    this.view = view;
                    this.view.setPressed(true);
                    System.out.println("turning");
                    onClickListener.onClick(view);
                    return true;
                case MotionEvent.ACTION_UP:
                    handler.removeCallbacks(runnable);
                    view.setPressed(false);
                    view = null;
                    return true;
                case MotionEvent.ACTION_CANCEL:
                    handler.removeCallbacks(runnable);
                    view.setPressed(false);
                    view = null;
                    return true;
                case MotionEvent.ACTION_MOVE:
                    return false;
                default:
                    System.out.println("not handled");
                    return activity.onTouchEvent(motionEvent);
            }
        }
        else {
            System.out.println("I returned false");
            return false;
        }
    }
}
